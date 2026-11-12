import { Router } from 'express';

import { isSupportedDifficulty, isSupportedLanguage } from '../constants/game.js';
import { verifyToken } from '../middleware/auth.js';
import { getPlayableCast } from '../services/gameplay.service.js';
import { getActivePuzzle } from '../services/puzzle.service.js';
import { AppError } from '../utils/app-error.js';
import { parseTmdbId } from '../utils/validation.js';

export const movieRouter = Router();

movieRouter.get('/:tmdbId/cast', verifyToken, async (req, res, next) => {
  try {
    const tmdbId = parseTmdbId(req.params.tmdbId);
    const difficulty = req.query.difficulty ?? 'easy';
    const { language } = req.query;

    if (!isSupportedDifficulty(difficulty)) {
      throw new AppError('INVALID_DIFFICULTY', 'Query parameter difficulty must be easy or hard.', 400);
    }

    if (!isSupportedLanguage(language)) {
      throw new AppError('INVALID_LANGUAGE', 'Query parameter language is required and must be supported.', 400);
    }

    let connectorActorIds = [];

    if (difficulty === 'hard') {
      connectorActorIds = await getTodayConnectorActorIds(language);
    }

    const connectorSet = new Set(connectorActorIds);
    const cast = (await getPlayableCast(tmdbId))
      .map((actor) => {
        const hidden = connectorSet.has(actor.tmdb_id);

        return {
          tmdb_id: actor.tmdb_id,
          name: hidden ? '???' : actor.name,
          character: actor.character,
          profile_path: hidden ? null : actor.profile_path,
          hidden
        };
      });

    res.json({
      movie_tmdb_id: tmdbId,
      cast
    });
  } catch (error) {
    next(error);
  }
});

async function getTodayConnectorActorIds(language) {
  const puzzle = await getActivePuzzle(language, 'connector_actor_ids');
  return puzzle.connector_actor_ids ?? [];
}
