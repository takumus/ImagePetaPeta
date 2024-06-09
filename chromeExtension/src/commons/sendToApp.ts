import { APP_HOST } from "$/deines";

import { IpcFunctions } from "@/commons/ipc/ipcFunctions";

export async function sendToApp<C extends keyof IpcFunctions, U extends keyof IpcFunctions[C]>(
  category: C,
  event: U,
  ...args: Parameters<IpcFunctions[C][U] extends (...args: any) => any ? IpcFunctions[C][U] : never>
): Promise<
  ReturnType<IpcFunctions[C][U] extends (...args: any) => any ? IpcFunctions[C][U] : never>
> {
  // | { error: string }
  const response = await fetch(APP_HOST, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: `${category}.${event as any}`,
      args,
    }),
  });
  return (await response.json()).response;
}
