/** Sets the globe canvas's mouse cursor. */
export function setGlobeCursor(cursor: string) {
  const element = document.querySelector<HTMLCanvasElement>('[data-globe]')
  if (element) element.style.cursor = cursor
}
