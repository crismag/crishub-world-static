/** Grown from 2.2 so shores have open sea between them and room for wild land and ridges. */
export const GLOBE_RADIUS = 4

export function setGlobeCursor(cursor: string) {
  const element = document.querySelector<HTMLCanvasElement>('[data-globe]')
  if (element) element.style.cursor = cursor
}
