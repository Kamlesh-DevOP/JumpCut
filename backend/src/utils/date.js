export function getUtcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getCurrentPuzzleSlot(intervalMinutes = 30, date = new Date()) {
  const slotMs = intervalMinutes * 60 * 1000;
  return new Date(Math.floor(date.getTime() / slotMs) * slotMs).toISOString();
}

export function getNextPuzzleSlot(intervalMinutes = 30, date = new Date()) {
  const slotMs = intervalMinutes * 60 * 1000;
  return new Date((Math.floor(date.getTime() / slotMs) + 1) * slotMs).toISOString();
}

export function getIndiaDayBounds(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const day = `${values.year}-${values.month}-${values.day}`;
  const start = new Date(`${day}T00:00:00+05:30`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { day, start: start.toISOString(), end: end.toISOString() };
}
