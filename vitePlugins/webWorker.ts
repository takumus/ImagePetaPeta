import { Plugin } from "vite";

export default (pluginOptions?: {}): Plugin => {
  return {
    name: "web-worker",
    transform(code, id, options) {
      if (/import.*?from.*?.*?\.!ww["']/g.exec(code)) {
        console.log("WebWorker:", id);
        return {
          code: code.replace(".!ww", ".!ww?worker"),
        };
      }
    },
  };
};
