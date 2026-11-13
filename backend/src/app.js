import cors from 'cors';
import express from 'express';

import { config } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { actorRouter } from './routes/actor.routes.js';
import { configRouter } from './routes/config.routes.js';
import { friendsRouter } from './routes/friends.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { generateUpcomingPuzzles } from './routes/internal.routes.js';
import { leaderboardRouter } from './routes/leaderboard.routes.js';
import { movieRouter } from './routes/movie.routes.js';
import { puzzleRouter } from './routes/puzzle.routes.js';
import { sessionRouter } from './routes/session.routes.js';
import { userRouter } from './routes/user.routes.js';

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.post('/api/v1/internal/puzzles/generate', generateUpcomingPuzzles);
  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/config', configRouter);
  app.use('/api/v1/leaderboard', leaderboardRouter);
  app.use('/api/v1/puzzle', puzzleRouter);
  app.use('/api/v1/movie', movieRouter);
  app.use('/api/v1/actor', actorRouter);
  app.use('/api/v1/session', sessionRouter);
  app.use('/api/v1/friends', friendsRouter);
  app.use('/api/v1/user', userRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
