import { App } from "vue";
const params = parse(location.search);
export default {
  async install(app: App) {
    app.config.globalProperties.$windowArgs = params.args;
  },
};
declare module "@vue/runtime-core" {
  export interface ComponentCustomProperties {
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
