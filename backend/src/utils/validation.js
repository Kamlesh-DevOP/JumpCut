import { AppError } from './app-error.js';

export function parseTmdbId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError('INVALID_TMDB_ID', 'TMDB ID must be a positive integer.', 400);
  }

  return id;
}
