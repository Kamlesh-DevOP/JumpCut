import { Router } from 'express';

import { isSupportedDifficulty, isSupportedLanguage } from '../constants/game.js';
import { supabase } from '../db/supabase.js';
import { verifyToken } from '../middleware/auth.js';
import { getPlayableCast, getPlayableMovies, getStarHintMovies } from '../services/gameplay.service.js';
import { getActivePuzzle, getPuzzleBySlot } from '../services/puzzle.service.js';
import { AppError } from '../utils/app-error.js';
import { parseTmdbId } from '../utils/validation.js';

export const sessionRouter = Router();

sessionRouter.post('/start', verifyToken, async (req, res, next) => {
  try {
    const { language, difficulty } = req.body ?? {};
    validateGameOptions(language, difficulty);
    const puzzle = await getActivePuzzle(language, 'puzzle_slot, puzzle_date, optimal_path');
    const existing = await findSession(req.user.id, puzzle.puzzle_slot, language, difficulty);

    if (existing) {
      return res.json(withSolvedPath(existing, puzzle));
    }

    const { data: session, error } = await supabase
      .from('game_sessions')
      .insert({
        user_id: req.user.id,
        puzzle_date: puzzle.puzzle_date,
        puzzle_slot: puzzle.puzzle_slot,
        language,
        difficulty
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const resumed = await findSession(req.user.id, puzzle.puzzle_slot, language, difficulty);
        return res.json(withSolvedPath(resumed, puzzle));
      }
      throw error;
    }

    return res.status(201).json(session);
  } catch (error) {
    return next(error);
  }
});

sessionRouter.patch('/:sessionId/hop', verifyToken, async (req, res, next) => {
  try {
    const session = await getOwnedActiveSession(req.params.sessionId, req.user.id);
    const requestedHop = parseHop(req.body);
    const hop = await validateAndCanonicalizeHop(session, requestedHop);
    const path = [...session.path, hop];
    const hopCount = session.hop_count + 1;
    const puzzle = await getPuzzle(session.puzzle_slot, session.language);
    const solved = hop.type === 'actor' && hop.tmdb_id === puzzle.star_tmdb_id;
    const completedAt = solved ? new Date().toISOString() : null;
    const score = solved ? roundScore(puzzle.optimal_hop_count, hopCount) : null;
    const { data: updated, error } = await supabase
      .from('game_sessions')
      .update({
        path,
        hop_count: hopCount,
        status: solved ? 'solved' : 'in_progress',
        completed_at: completedAt,
        score
      })
      .eq('id', session.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (solved) {
      await recordSolvedSession(updated, completedAt);
    }

    return res.json(solved ? { ...updated, optimal_path: puzzle.optimal_path } : updated);
  } catch (error) {
    return next(error);
  }
});

sessionRouter.patch('/:sessionId/undo', verifyToken, async (req, res, next) => {
  try {
    const session = await getOwnedActiveSession(req.params.sessionId, req.user.id);

    if (session.undos_used >= 3) {
      throw new AppError('NO_UNDOS_REMAINING', 'No undos remaining', 403);
    }
    if (session.path.length === 0) {
      throw new AppError('NO_HOPS_TO_UNDO', 'No hops to undo.', 400);
    }

    const { data: updated, error } = await supabase
      .from('game_sessions')
      .update({
        path: session.path.slice(0, -1),
        hop_count: Math.max(0, session.hop_count - 1),
        undos_used: session.undos_used + 1
      })
      .eq('id', session.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
});

sessionRouter.get('/:sessionId/hint', verifyToken, async (req, res, next) => {
  try {
    const session = await getOwnedActiveSession(req.params.sessionId, req.user.id);
    const puzzle = await getPuzzle(session.puzzle_slot, session.language);
    const movies = await getStarHintMovies(puzzle.star_tmdb_id);
    const updatedSession = await markHintUsed(session);

    return res.json({
      session: updatedSession,
      movies
    });
  } catch (error) {
    return next(error);
  }
});

function validateGameOptions(language, difficulty) {
  if (!isSupportedLanguage(language)) {
    throw new AppError('INVALID_LANGUAGE', 'Language must be supported.', 400);
  }
  if (!isSupportedDifficulty(difficulty)) {
    throw new AppError('INVALID_DIFFICULTY', 'Difficulty must be easy or hard.', 400);
  }
}

function parseHop(body) {
  if (!body || !['movie', 'actor'].includes(body.type)) {
    throw new AppError('INVALID_HOP', 'Hop type must be movie or actor.', 400);
  }
  return { type: body.type, tmdb_id: parseTmdbId(body.tmdb_id) };
}

async function findSession(userId, puzzleSlot, language, difficulty) {
  const { data, error } = await supabase
    .from('game_sessions')
    .select()
    .eq('user_id', userId)
    .eq('puzzle_slot', puzzleSlot)
    .eq('language', language)
    .eq('difficulty', difficulty)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

async function getOwnedActiveSession(sessionId, userId) {
  const { data: session, error } = await supabase
    .from('game_sessions')
    .select()
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!session) {
    throw new AppError('SESSION_NOT_FOUND', 'No session found.', 404);
  }
  if (session.status !== 'in_progress') {
    throw new AppError('SESSION_NOT_IN_PROGRESS', 'This session is no longer in progress.', 400);
  }
  return session;
}

async function validateAndCanonicalizeHop(session, requestedHop) {
  const lastHop = session.path.at(-1);
  const expectedType = lastHop?.type === 'actor' ? 'movie' : 'actor';

  if (requestedHop.type !== expectedType) {
    throw new AppError('INVALID_HOP_ORDER', `Expected a ${expectedType} hop.`, 400);
  }

  if (requestedHop.type === 'actor') {
    const currentMovieId = lastHop?.tmdb_id ?? (await getStartMovieId(session.puzzle_slot, session.language));
    const actor = (await getPlayableCast(currentMovieId)).find((item) => item.tmdb_id === requestedHop.tmdb_id);
    if (!actor) {
      throw new AppError('INVALID_HOP', 'Actor is not available from the current movie.', 400);
    }
    if (session.difficulty === 'hard') {
      const puzzle = await getPuzzle(session.puzzle_slot, session.language);
      if (puzzle.connector_actor_ids.includes(actor.tmdb_id)) {
        throw new AppError('HIDDEN_CONNECTOR', 'Hidden connector actors cannot be selected in Hard mode.', 403);
      }
    }
    return { type: 'actor', tmdb_id: actor.tmdb_id, name: actor.name, poster_path: actor.profile_path };
  }

  const movies = await getPlayableMovies(lastHop.tmdb_id);
  const movie = movies.find((item) => item.tmdb_id === requestedHop.tmdb_id);
  if (!movie) {
    throw new AppError('INVALID_HOP', 'Movie is not available from the current actor.', 400);
  }
  return { type: 'movie', tmdb_id: movie.tmdb_id, name: movie.title, poster_path: movie.poster_path };
}

async function getPuzzle(puzzleSlot, language) {
  return getPuzzleBySlot(puzzleSlot, language, 'puzzle_date, puzzle_slot, star_tmdb_id, optimal_hop_count, connector_actor_ids, optimal_path');
}

async function markHintUsed(session) {
  if (session.hints_used > 0) {
    return session;
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .update({ hints_used: 1 })
    .eq('id', session.id)
    .eq('user_id', session.user_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getStartMovieId(puzzleSlot, language) {
  const data = await getPuzzleBySlot(puzzleSlot, language, 'start_movie_tmdb_id');
  return data.start_movie_tmdb_id;
}

function roundScore(optimalHopCount, hopCount) {
  return Math.min(10, Math.round((optimalHopCount / hopCount) * 1000) / 100);
}

function withSolvedPath(session, puzzle) {
  return session?.status === 'solved' ? { ...session, optimal_path: puzzle.optimal_path } : session;
}

async function recordSolvedSession(session, completedAt) {
  const solvedRow = {
    user_id: session.user_id,
    puzzle_date: session.puzzle_date,
    puzzle_slot: session.puzzle_slot,
    language: session.language,
    difficulty: session.difficulty,
    hop_count: session.hop_count,
    score: session.score,
    completed_at: completedAt
  };

  const { error: leaderboardError } = await supabase
    .from('leaderboard')
    .upsert(solvedRow, { onConflict: 'user_id,puzzle_slot,language,difficulty' });
  if (leaderboardError) {
    throw leaderboardError;
  }

  const { error: pointsError } = await supabase
    .from('user_points')
    .upsert(
      {
        user_id: session.user_id,
        puzzle_date: session.puzzle_date,
        puzzle_slot: session.puzzle_slot,
        language: session.language,
        difficulty: session.difficulty,
        score: session.score
      },
      { onConflict: 'user_id,puzzle_slot,language,difficulty' }
    );
  if (pointsError) {
    throw pointsError;
  }

  const { data: streak, error: streakError } = await supabase
    .from('streaks')
    .select()
    .eq('user_id', session.user_id)
    .maybeSingle();
  if (streakError) {
    throw streakError;
  }

  const yesterday = new Date(`${session.puzzle_date}T00:00:00.000Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const continuesStreak = streak?.last_solved_date === yesterday.toISOString().slice(0, 10);
  const currentStreak = streak?.last_solved_date === session.puzzle_date
    ? streak.current_streak
    : continuesStreak ? (streak?.current_streak ?? 0) + 1 : 1;
  const longestStreak = Math.max(streak?.longest_streak ?? 0, currentStreak);
  const { error: updateStreakError } = await supabase
    .from('streaks')
    .upsert({ user_id: session.user_id, current_streak: currentStreak, longest_streak: longestStreak, last_solved_date: session.puzzle_date });
  if (updateStreakError) {
    throw updateStreakError;
  }
}
