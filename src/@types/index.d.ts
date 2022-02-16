/* eslint-disable */
declare module '*.png' {
  const src: string;
  export default src;
}
declare module '*.vue' {
  import type { DefineComponent } from "vue"
  const component: DefineComponent<{}, {}, any>
  export default component
}
declare module 'deepcopy' {
  export default function<T>(value: T): T;
}