/**
 * How big a word can be written on a board without spilling off it: as tall
 * as `fill` of the board's height, then smaller until its measured width fits
 * inside `room` of the board's width. `measure(size)` is the word's width at
 * that font size (a canvas's measureText in the game).
 */
export function fitWord({ width, height, measure, fill = 0.62, room = 0.86 }) {
  const tall = height * fill;
  const wide = measure(tall);
  if (!(wide > 0)) return tall;
  return Math.min(tall, (tall * width * room) / wide);
}
