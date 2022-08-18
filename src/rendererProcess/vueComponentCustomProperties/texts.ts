import { reactive, App } from "vue";
interface Texts {
  close: string;
  plus: string;
}
export function createPlugin(platform: NodeJS.Platform) {
  return {
    install(app: App) {
      app.config.globalProperties.$texts = {
        close: "✕",
        plus: "＋",
      } as Texts;
    },
  };
}
declare module "@vue/runtime-core" {
  export interface ComponentCustomProperties {
    $texts: Readonly<Texts>;
  }
}
