import { Router } from 'express';

import { verifyToken } from '../middleware/auth.js';
import { getPlayableMovies } from '../services/gameplay.service.js';
import { parseTmdbId } from '../utils/validation.js';

export const actorRouter = Router();

actorRouter.get('/:tmdbId/movies', verifyToken, async (req, res, next) => {
  try {
    const tmdbId = parseTmdbId(req.params.tmdbId);
    const movies = await getPlayableMovies(tmdbId);

    res.json({
      actor_tmdb_id: tmdbId,
      movies
    });
  } catch (error) {
    next(error);
  }
});
