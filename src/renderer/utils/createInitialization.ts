import { IPC } from "@/renderer/libs/ipc";

export function createInitialization() {
  const initializationDOM = document.body.querySelector("#initialization") as HTMLElement;
  const initializationTitleDOM = document.body.querySelector(
    "#initialization-title",
  ) as HTMLElement;
  const initializationLogDOM = document.body.querySelector("#initialization-log") as HTMLElement;
  return {
    initialize: async () => {
      const appInfo = await IPC.common.getAppInfo();
      initializationDOM.style.color = (await IPC.common.getStyle())["--color-font"];
      initializationTitleDOM.innerHTML = `${appInfo.name}-${appInfo.version}`;
      IPC.initialization.on("progress", (e, log) => {
        initializationLogDOM.innerHTML = `${log}\n${initializationLogDOM.innerHTML}`
          .split("\n")
          .slice(0, 100)
          .join("\n");
      });
      initializationLogDOM.innerHTML = `Initializing Data...`;
    },
    destroy: () => {
      initializationDOM.remove();
    },
  };
}
