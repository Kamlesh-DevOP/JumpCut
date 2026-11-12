import { ActorCard } from './ActorCard.jsx';

export function CastGrid({ cast, onSelectActor }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {cast.map((actor) => (
        <ActorCard key={`${actor.tmdb_id}-${actor.character}`} actor={actor} onClick={onSelectActor} />
      ))}
    </div>
  );
}
