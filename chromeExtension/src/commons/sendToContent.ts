import { MessagesToContent } from "$/commons/messages";

export function sendToContent<U extends keyof MessagesToContent>(
  tabId: number,
  type: U,
  ...args: Parameters<MessagesToContent[U]>
): ReturnType<MessagesToContent[U]> {
  return new Promise((res, rej) => {
    try {
      chrome.tabs.sendMessage(
        tabId,
        {
          type,
          args,
        },
        (data) => {
          res(data.value);
        },
      );
    } catch (err) {
      // rej(err);
    }
  }) as any;
}
