import { getMovieCredits, getPersonMovieCredits } from './tmdb.service.js';

export async function getPlayableCast(movieTmdbId) {
  const credits = await getMovieCredits(movieTmdbId);

  return (credits.cast ?? [])
    .filter((actor) => actor.known_for_department === 'Acting')
    .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER))
    .map((actor) => ({
      tmdb_id: actor.id,
      name: actor.name,
      character: actor.character,
      profile_path: actor.profile_path
    }));
}

export async function getPlayableMovies(actorTmdbId) {
  const credits = await getPersonMovieCredits(actorTmdbId);

  return (credits.cast ?? [])
    .filter((movie) => movie.id && movie.title)
    .sort((left, right) => (right.popularity ?? 0) - (left.popularity ?? 0))
    .map((movie) => ({
      tmdb_id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null,
      vote_average: movie.vote_average
    }));
}

export async function getStarHintMovies(actorTmdbId) {
  const credits = await getPersonMovieCredits(actorTmdbId);

  return (credits.cast ?? [])
    .filter((movie) => movie.id && movie.title)
    .sort((left, right) => (right.popularity ?? 0) - (left.popularity ?? 0))
    .slice(0, 5)
    .map((movie) => ({
      tmdb_id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      year: movie.release_date ? Number(movie.release_date.slice(0, 4)) : null
    }));
}
