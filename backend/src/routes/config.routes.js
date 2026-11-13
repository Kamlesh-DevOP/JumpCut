import { Router } from 'express';

import { config } from '../config/env.js';

export const configRouter = Router();

configRouter.get('/', (_req, res) => {
  res.json({ puzzle_interval_minutes: config.puzzleIntervalMinutes });
});
