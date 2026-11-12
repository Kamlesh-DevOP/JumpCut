import { api } from './client.js';

export async function getCurrentLeaderboard({ scope, language, difficulty }) {
  const path = scope === 'friends'
    ? '/api/v1/leaderboard/friends/current'
    : '/api/v1/leaderboard/daily/current';
  const { data } = await api.get(path, { params: { language, difficulty } });
  return data;
}

export async function getDailyLeaderboard(scope) {
  const path = scope === 'friends'
    ? '/api/v1/leaderboard/friends/aggregate/daily'
    : '/api/v1/leaderboard/aggregate/daily';
  const { data } = await api.get(path);
  return data;
}
