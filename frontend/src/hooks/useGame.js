import { useState } from 'react';

import { api, getApiErrorMessage } from '../api/client.js';
import { useGameStore } from '../store/gameStore.js';

export function useGame() {
  const [isLoadingChoices, setIsLoadingChoices] = useState(false);
  const [isLoadingHint, setIsLoadingHint] = useState(false);
  const [error, setError] = useState('');
  const game = useGameStore();

  async function loadCast(movie = game.currentMovie) {
    if (!movie) {
      return;
    }

    setIsLoadingChoices(true);
    setError('');

    try {
      const response = await api.get(`/api/v1/movie/${movie.tmdb_id}/cast`, {
        params: {
          difficulty: game.difficulty,
          language: game.language
        }
      });
      game.setCast(response.data.cast);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoadingChoices(false);
    }
  }

  async function loadActorMovies(actor = game.currentActor) {
    if (!actor) {
      return;
    }

    setIsLoadingChoices(true);
    setError('');

    try {
      const response = await api.get(`/api/v1/actor/${actor.tmdb_id}/movies`);
      game.setActorMovies(response.data.movies);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoadingChoices(false);
    }
  }

  async function selectActor(actor, recordHop) {
    if (actor.hidden || !game.sessionId) {
      return;
    }

    setIsLoadingChoices(true);
    setError('');

    try {
      const session = await recordHop(game.sessionId, { type: 'actor', tmdb_id: actor.tmdb_id });
      game.syncSession(session);

      if (session.status !== 'solved') {
        await loadActorMovies(actor);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoadingChoices(false);
    }
  }

  async function selectMovie(movie, recordHop) {
    if (!game.sessionId) {
      return;
    }

    setIsLoadingChoices(true);
    setError('');

    try {
      const session = await recordHop(game.sessionId, { type: 'movie', tmdb_id: movie.tmdb_id });
      game.syncSession(session);
      await loadCast(movie);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoadingChoices(false);
    }
  }

  async function undo(undoSession) {
    if (!game.sessionId) {
      return;
    }

    setIsLoadingChoices(true);
    setError('');

    try {
      const session = await undoSession(game.sessionId);
      game.syncSession(session);

      const lastHop = session.path.at(-1);
      if (lastHop?.type === 'actor') {
        await loadActorMovies({ tmdb_id: lastHop.tmdb_id, name: lastHop.name, profile_path: lastHop.poster_path });
      } else {
        await loadCast(lastHop ? { tmdb_id: lastHop.tmdb_id, title: lastHop.name, poster_path: lastHop.poster_path } : game.puzzle?.start_movie);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoadingChoices(false);
    }
  }

  async function revealHint(getHint) {
    if (!game.sessionId || isLoadingHint) {
      return;
    }

    setIsLoadingHint(true);
    setError('');

    try {
      const hint = await getHint(game.sessionId);
      game.setHintResult(hint.session, hint.movies);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setIsLoadingHint(false);
    }
  }

  return {
    ...game,
    error,
    isLoadingChoices,
    isLoadingHint,
    loadCast,
    loadActorMovies,
    selectActor,
    selectMovie,
    undo,
    revealHint
  };
}
