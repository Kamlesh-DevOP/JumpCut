import { api } from './client.js';

export async function getCurrentProfile() {
  const { data } = await api.get('/api/v1/user/profile');
  return data.profile;
}

export async function updateProfile(username) {
  const { data } = await api.patch('/api/v1/user/profile', { username });
  return data.profile;
}
