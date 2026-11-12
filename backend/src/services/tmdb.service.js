import { config } from '../config/env.js';
import { AppError } from '../utils/app-error.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const cache = new Map();

export async function getMovieDetails(tmdbId) {
  return tmdbGet(`/movie/${tmdbId}`);
}

export async function getPersonDetails(tmdbId) {
  return tmdbGet(`/person/${tmdbId}`);
}

export async function getMovieCredits(tmdbId) {
  return tmdbGet(`/movie/${tmdbId}/credits`);
}

export async function getPersonMovieCredits(tmdbId) {
  return tmdbGet(`/person/${tmdbId}/movie_credits`);
}

async function tmdbGet(path) {
  const cacheKey = path;
  const cached = cache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await fetch(`${config.tmdbBaseUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${config.tmdbApiKey}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new AppError('TMDB_REQUEST_FAILED', "Couldn't load data, please try again.", 502);
  }

  const data = await response.json();
  cache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ONE_HOUR_MS
  });

  return data;
}
