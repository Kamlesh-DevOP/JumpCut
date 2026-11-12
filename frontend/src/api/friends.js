import { api } from './client.js';

export async function getFriends() {
  const { data } = await api.get('/api/v1/friends');
  return data.friends;
}

export async function getFriendRequests() {
  const { data } = await api.get('/api/v1/friends/requests');
  return data.requests;
}

export async function sendFriendRequest(jumpcutId) {
  await api.post('/api/v1/friends/request', { jumpcut_id: jumpcutId });
}

export async function acceptFriendRequest(friendshipId) {
  await api.patch(`/api/v1/friends/${friendshipId}/accept`);
}

export async function removeFriendship(friendshipId) {
  await api.delete(`/api/v1/friends/${friendshipId}`);
}
