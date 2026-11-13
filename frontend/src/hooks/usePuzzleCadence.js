import { useEffect, useState } from 'react';

import { api } from '../api/client.js';

export function usePuzzleCadence() {
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    let mounted = true;

    async function loadCadence() {
      try {
        const { data } = await api.get('/api/v1/config');
        if (mounted && Number.isInteger(data.puzzle_interval_minutes)) {
          setMinutes(data.puzzle_interval_minutes);
        }
      } catch {
        // Keep the sensible default if the configuration endpoint is unavailable.
      }
    }

    loadCadence();
    return () => {
      mounted = false;
    };
  }, []);

  return minutes;
}
