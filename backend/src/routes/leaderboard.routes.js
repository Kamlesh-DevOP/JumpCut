import { Router } from 'express';

import { isSupportedDifficulty, isSupportedLanguage } from '../constants/game.js';
import { supabase } from '../db/supabase.js';
import { verifyToken } from '../middleware/auth.js';
import { getActivePuzzle } from '../services/puzzle.service.js';
import { AppError } from '../utils/app-error.js';
import { getIndiaDayBounds } from '../utils/date.js';

export const leaderboardRouter = Router();

leaderboardRouter.get('/daily/current', verifyToken, async (req, res, next) => {
  try {
    const options = validateOptions(req.query);
    const puzzle = await getActivePuzzle(options.language, 'puzzle_date, puzzle_slot');
    const entries = await getEntries(puzzle.puzzle_slot, options);

    res.json(formatResponse(puzzle, options, entries));
  } catch (error) {
    next(error);
  }
});

leaderboardRouter.get('/friends/current', verifyToken, async (req, res, next) => {
  try {
    const options = validateOptions(req.query);
    const puzzle = await getActivePuzzle(options.language, 'puzzle_date, puzzle_slot');
    const friendIds = await getAcceptedFriendIds(req.user.id);
    const entries = await getEntries(puzzle.puzzle_slot, options, [req.user.id, ...friendIds]);

    res.json(formatResponse(puzzle, options, entries));
  } catch (error) {
    next(error);
  }
});

leaderboardRouter.get('/aggregate/daily', verifyToken, async (_req, res, next) => {
  try {
    const dayBounds = getIndiaDayBounds();
    const entries = await getDailyTotals(dayBounds);

    res.json(formatDailyResponse(dayBounds, entries, 20));
  } catch (error) {
    next(error);
  }
});

leaderboardRouter.get('/friends/aggregate/daily', verifyToken, async (req, res, next) => {
  try {
    const dayBounds = getIndiaDayBounds();
    const friendIds = await getAcceptedFriendIds(req.user.id);
    const entries = await getDailyTotals(dayBounds, [req.user.id, ...friendIds]);

    res.json(formatDailyResponse(dayBounds, entries));
  } catch (error) {
    next(error);
  }
});

function validateOptions({ language, difficulty }) {
  if (!isSupportedLanguage(language)) {
    throw new AppError('INVALID_LANGUAGE', 'Language must be supported.', 400);
  }
  if (!isSupportedDifficulty(difficulty)) {
    throw new AppError('INVALID_DIFFICULTY', 'Difficulty must be easy or hard.', 400);
  }
  return { language, difficulty };
}

async function getEntries(puzzleSlot, { language, difficulty }, userIds) {
  let query = supabase
    .from('leaderboard')
    .select('user_id, hop_count, score, completed_at')
    .eq('puzzle_slot', puzzleSlot)
    .eq('language', language)
    .eq('difficulty', difficulty)
    .order('hop_count', { ascending: true })
    .order('completed_at', { ascending: true });

  if (userIds) {
    query = query.in('user_id', userIds);
  } else {
    query = query.limit(10);
  }

  const { data: rows, error } = await query;
  if (error) {
    throw error;
  }

  const profiles = await getProfiles(rows.map((row) => row.user_id));
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return rows
    .map((row) => {
      const profile = profilesById.get(row.user_id);
      return profile && { ...row, ...profile };
    })
    .filter(Boolean);
}

async function getAcceptedFriendIds(userId) {
  const { data, error } = await supabase
    .from('friends')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

  if (error) {
    throw error;
  }

  return data.map((friendship) => (
    friendship.requester_id === userId ? friendship.addressee_id : friendship.requester_id
  ));
}

async function getDailyTotals(dayBounds, userIds) {
  let query = supabase
    .from('user_points')
    .select('user_id, score')
    .gte('puzzle_slot', dayBounds.start)
    .lt('puzzle_slot', dayBounds.end);

  if (userIds) {
    query = query.in('user_id', userIds);
  }

  const { data: rows, error } = await query;
  if (error) {
    throw error;
  }

  const totalsByUser = new Map();
  for (const row of rows) {
    const total = totalsByUser.get(row.user_id) ?? { user_id: row.user_id, total_score: 0, puzzles_solved: 0 };
    total.total_score += Number(row.score);
    total.puzzles_solved += 1;
    totalsByUser.set(row.user_id, total);
  }

  const profiles = await getProfiles([...totalsByUser.keys()]);
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return [...totalsByUser.values()]
    .map((total) => {
      const profile = profilesById.get(total.user_id);
      return profile && { ...total, ...profile };
    })
    .filter(Boolean)
    .sort((left, right) => right.total_score - left.total_score || right.puzzles_solved - left.puzzles_solved);
}

async function getProfiles(userIds) {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, jumpcut_id')
    .in('id', userIds);

  if (error) {
    throw error;
  }
  return data;
}

function formatResponse(puzzle, options, entries) {
  return {
    puzzle_date: puzzle.puzzle_date,
    puzzle_slot: puzzle.puzzle_slot,
    language: options.language,
    difficulty: options.difficulty,
    entries: entries.map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      jumpcut_id: entry.jumpcut_id,
      hop_count: entry.hop_count,
      score: entry.score,
      completed_at: entry.completed_at
    }))
  };
}

function formatDailyResponse(dayBounds, entries, limit) {
  return {
    period: 'daily',
    day: dayBounds.day,
    timezone: 'Asia/Kolkata',
    entries: entries.slice(0, limit).map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      jumpcut_id: entry.jumpcut_id,
      total_score: Number(entry.total_score.toFixed(2)),
      puzzles_solved: entry.puzzles_solved
    }))
  };
}
