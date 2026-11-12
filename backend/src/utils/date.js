export function getUtcDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getCurrentPuzzleSlot(date = new Date()) {
  const slotMs = 5 * 60 * 1000;
  return new Date(Math.floor(date.getTime() / slotMs) * slotMs).toISOString();
}
