import { supabase } from '../db/supabase.js';
import { AppError } from '../utils/app-error.js';
import { getCurrentPuzzleSlot } from '../utils/date.js';

export async function getActivePuzzle(language, columns = '*') {
  return getPuzzleBySlot(getCurrentPuzzleSlot(), language, columns);
}

export async function getPuzzleBySlot(puzzleSlot, language, columns = '*') {
  const { data, error } = await supabase
    .from('daily_puzzles')
    .select(columns)
    .eq('puzzle_slot', puzzleSlot)
    .eq('language', language)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    throw new AppError('PUZZLE_NOT_FOUND', 'No puzzle found for the current five-minute slot and language.', 404);
  }

  return data;
}
