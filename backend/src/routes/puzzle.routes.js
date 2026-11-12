import { Router } from 'express';

import { isSupportedLanguage } from '../constants/game.js';
import { getPersonDetails, getMovieDetails } from '../services/tmdb.service.js';
import { getActivePuzzle } from '../services/puzzle.service.js';
import { AppError } from '../utils/app-error.js';

export const puzzleRouter = Router();

puzzleRouter.get('/today', async (req, res, next) => {
  try {
    const { language } = req.query;

    if (!isSupportedLanguage(language)) {
      throw new AppError('INVALID_LANGUAGE', 'Query parameter language is required and must be supported.', 400);
    }

    const puzzle = await getActivePuzzle(
      language,
      'puzzle_slot, puzzle_date, language, start_movie_tmdb_id, start_movie_title, star_tmdb_id, star_name, optimal_hop_count'
    );

    const [movie, person] = await Promise.all([
      getMovieDetails(puzzle.start_movie_tmdb_id),
      getPersonDetails(puzzle.star_tmdb_id)
    ]);

    res.json({
      puzzle_slot: puzzle.puzzle_slot,
      puzzle_date: puzzle.puzzle_date,
      language: puzzle.language,
      start_movie: {
        tmdb_id: puzzle.start_movie_tmdb_id,
        title: puzzle.start_movie_title,
        poster_path: movie.poster_path ?? null,
        year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null
      },
      star: {
        tmdb_id: puzzle.star_tmdb_id,
        name: puzzle.star_name,
        profile_path: person.profile_path ?? null
      },
      optimal_hop_count: puzzle.optimal_hop_count
    });
  } catch (error) {
    next(error);
  }
});
