export function createShareText({ puzzle, language, difficulty, hopCount, score, path }) {
  const markers = path.map((entry) => (entry.type === 'movie' ? '🎬' : '⭐'));

  if (markers.length > 0) {
    markers[markers.length - 1] = '🏆';
  }

  return [
    `JumpCut #${puzzle?.puzzle_date ?? 'daily'} [${capitalize(language)}] — ${capitalize(difficulty)}`,
    `Reached The Star in ${hopCount} hops • Score: ${Number(score ?? 0).toFixed(2)}/10 🎬`,
    markers.join(' '),
    '',
    'play.jumpcut.app'
  ].join('\n');
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}
