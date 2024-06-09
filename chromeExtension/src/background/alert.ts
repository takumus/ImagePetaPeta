import { getCurrentTab } from "$/background/getCurrentTab";

export async function _alert(message: string) {
  const tabId = (await getCurrentTab())?.id;
  if (tabId === undefined) {
    return;
  }
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (message: string) => {
      alert(message);
    },
    args: [message],
  });
}
