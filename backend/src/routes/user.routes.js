import { Router } from 'express';

import { supabase } from '../db/supabase.js';
import { verifyToken } from '../middleware/auth.js';
import { AppError } from '../utils/app-error.js';

export const userRouter = Router();

userRouter.get('/profile', verifyToken, async (req, res, next) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, jumpcut_id, created_at')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!profile) {
      throw new AppError('PROFILE_NOT_FOUND', 'Your JumpCut profile is not ready yet.', 404);
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

userRouter.patch('/profile', verifyToken, async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .neq('id', req.user.id)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }
    if (existing) {
      throw new AppError('USERNAME_TAKEN', 'That username is already in use.', 400);
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', req.user.id)
      .select('id, username, jumpcut_id, created_at')
      .single();

    if (error) {
      throw error;
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

function normalizeUsername(value) {
  if (typeof value !== 'string') {
    throw new AppError('INVALID_USERNAME', 'Enter a username between 3 and 32 characters.', 400);
  }

  const username = value.trim();
  if (!/^[a-zA-Z0-9_ ]{3,32}$/.test(username)) {
    throw new AppError('INVALID_USERNAME', 'Use 3-32 letters, numbers, spaces, or underscores.', 400);
  }

  return username;
}
