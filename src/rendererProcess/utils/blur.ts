export function blur() {
  try {
    (window.document.activeElement as HTMLElement).blur();
  } catch (error) {
    //
  }
}