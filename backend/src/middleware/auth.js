import { supabase } from '../db/supabase.js';
import { AppError } from '../utils/app-error.js';

export async function verifyToken(req, _res, next) {
  try {
    const authHeader = req.get('authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError('UNAUTHENTICATED', 'Missing authorization token.', 401);
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new AppError('UNAUTHENTICATED', 'Invalid authorization token.', 401);
    }

    req.user = {
      id: data.user.id,
      email: data.user.email
    };

    next();
  } catch (error) {
    next(error);
  }
}
