import { WindowType } from "@/commons/datas/windowType";
import { App } from "vue";
export function createPlugin() {
  const params = parse(location.search);
  console.log(params)
  return {
    async install(app: App) {
      app.config.globalProperties.$windowType = params.type;
      app.config.globalProperties.$windowArgs = params.args;
    },
    windowType: params.type as WindowType
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $windowType: WindowType;
    $windowArgs: any;
  }
}

function parse(search: string) {
  const object: { [key: string]: string | undefined } = {};
  const keyValueString = search.replace(/\?/g, "").split("&");
  keyValueString.map((keyValue) => {
    const keyValueArray = keyValue.split("=");
    const key = keyValueArray[0]!;
    const value = keyValueArray[1]!;
    object[key] = value;
  });
  return object;
}