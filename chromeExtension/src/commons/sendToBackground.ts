import { MessagesToBackground } from "$/commons/messages";

export function sendToBackground<U extends keyof MessagesToBackground>(
  type: U,
  ...args: Parameters<MessagesToBackground[U]>
): ReturnType<MessagesToBackground[U]> {
  return new Promise((res, rej) => {
    try {
      chrome.runtime.sendMessage(
        {
          type,
          args,
        },
        (data) => {
          res(data.value);
        },
      );
    } catch (err) {
      rej(err);
    }
  }) as any;
}
