import { timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { SUPPORTED_LANGUAGES } from '../constants/game.js';
import { config } from '../config/env.js';
import { supabase } from '../db/supabase.js';
import { getNextPuzzleSlot } from '../utils/date.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);
let generationPromise = null;

export async function generateUpcomingPuzzles(req, res, next) {
  let startedGeneration = null;

  try {
    verifyCronSecret(req);

    if (generationPromise) {
      return res.status(202).json({ status: 'already_running' });
    }

    const puzzleSlot = getNextPuzzleSlot(config.puzzleIntervalMinutes);
    const missingLanguages = await getMissingLanguages(puzzleSlot);
    if (missingLanguages.length === 0) {
      return res.json({ status: 'already_generated', puzzle_slot: puzzleSlot });
    }

    startedGeneration = runGenerator(puzzleSlot);
    generationPromise = startedGeneration;
    await startedGeneration;

    const remainingLanguages = await getMissingLanguages(puzzleSlot);
    if (remainingLanguages.length > 0) {
      throw new AppError('PUZZLE_GENERATION_INCOMPLETE', 'Puzzle generation did not create every language.', 500);
    }

    return res.status(201).json({ status: 'generated', puzzle_slot: puzzleSlot });
  } catch (error) {
    return next(error);
  } finally {
    if (startedGeneration && generationPromise === startedGeneration) {
      generationPromise = null;
    }
  }
}

function verifyCronSecret(req) {
  if (!config.puzzleCronSecret) {
    throw new AppError('CRON_NOT_CONFIGURED', 'Puzzle generation is not configured.', 503);
  }

  const provided = Buffer.from(req.get('x-cron-secret') ?? '');
  const expected = Buffer.from(config.puzzleCronSecret);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    throw new AppError('UNAUTHORIZED', 'Invalid cron secret.', 401);
  }
}

async function getMissingLanguages(puzzleSlot) {
  const { data, error } = await supabase
    .from('daily_puzzles')
    .select('language')
    .eq('puzzle_slot', puzzleSlot);

  if (error) {
    throw error;
  }

  const availableLanguages = new Set(data.map((puzzle) => puzzle.language));
  return SUPPORTED_LANGUAGES.filter((language) => !availableLanguages.has(language));
}

async function runGenerator(puzzleSlot) {
  try {
    const { stdout, stderr } = await execFileAsync(
      config.puzzlePythonBin,
      ['generate_puzzle.py', '--slot', puzzleSlot],
      {
        cwd: config.pipelineDirectory,
        env: process.env,
        timeout: 15 * 60 * 1000,
        maxBuffer: 2 * 1024 * 1024
      }
    );

    if (stdout.trim()) {
      logger.info(stdout.trim());
    }
    if (stderr.trim()) {
      logger.error(stderr.trim());
    }
  } catch (error) {
    logger.error(error);
    throw new AppError('PUZZLE_GENERATION_FAILED', 'Could not generate the upcoming puzzles.', 500);
  }
}
