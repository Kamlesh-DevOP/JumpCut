import { useState } from 'react';

import { api } from '../api/client.js';

export function useSession() {
  const [session, setSession] = useState(null);

  async function startSession({ language, difficulty }) {
    const { data } = await api.post('/api/v1/session/start', { language, difficulty });
    setSession(data);
    return data;
  }

  async function recordHop(sessionId, hop) {
    const { data } = await api.patch(`/api/v1/session/${sessionId}/hop`, hop);
    setSession(data);
    return data;
  }

  async function undo(sessionId) {
    const { data } = await api.patch(`/api/v1/session/${sessionId}/undo`);
    setSession(data);
    return data;
  }

  return { session, startSession, recordHop, undo };
}
