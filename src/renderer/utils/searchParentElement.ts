export function searchParentElement(
  element: HTMLElement | null | undefined,
  parentElement: HTMLElement | null | undefined,
): boolean {
  if (element == null || parentElement == null) {
    return false;
  }
  if (element === parentElement || element?.parentElement === parentElement) {
    return true;
  }
  return searchParentElement(element?.parentElement, parentElement);
}
