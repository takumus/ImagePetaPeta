export async function getCurrentTab() {
  const tab = (await chrome.tabs.query({ currentWindow: true, active: true }))[0];
  if (tab === undefined) {
    return;
  }
  return tab;
}
