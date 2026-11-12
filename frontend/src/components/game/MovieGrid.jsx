import { MovieCard } from './MovieCard.jsx';

export function MovieGrid({ movies, onSelectMovie }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {movies.map((movie) => (
        <MovieCard key={movie.tmdb_id} movie={movie} onClick={onSelectMovie} />
      ))}
    </div>
  );
}
