const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

export function imageUrl(path) {
  return path ? `${imageBaseUrl}${path}` : '';
}
