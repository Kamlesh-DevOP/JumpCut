import { useCallback, useState } from 'react';

import { api, getApiErrorMessage } from '../api/client.js';

export function usePuzzle() {
  const [puzzle, setPuzzle] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadPuzzle = useCallback(async (language) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.get('/api/v1/puzzle/today', {
        params: { language }
      });
      setPuzzle(response.data);
      return response.data;
    } catch (requestError) {
      const message = getApiErrorMessage(requestError);
      setError(message);
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { puzzle, isLoading, error, loadPuzzle };
}
