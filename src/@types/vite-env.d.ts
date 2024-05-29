/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
interface ImportMetaEnv {
  readonly VITE_DEFAULT_WINDOW_POSITION?: string;
  readonly VITE_OPEN_DEVTOOL?: string;
}
