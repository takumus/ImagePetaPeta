export function isKeyboardLocked() {
  if (document.activeElement) {
    return document.activeElement.hasAttribute("lock-keyboard");
  }
  return false;
}