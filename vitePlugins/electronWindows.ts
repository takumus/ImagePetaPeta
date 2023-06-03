import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "path";
import { Plugin } from "vite";

export default (pluginOptions: {
  htmlDir: string;
  entryTSDirFromHTMLDir: string;
  windows: { name: string; templateHTMLFile: string }[];
}): Plugin => {
  return {
    name: "electronWindow",
    buildStart(options) {
      // rmSync(resolve(pluginOptions.htmlDir), { recursive: true, force: true });
      // mkdirSync(resolve(pluginOptions.htmlDir), { recursive: true });
      pluginOptions.windows.map((window) => {
        readFileSync(
          resolve(pluginOptions.htmlDir, pluginOptions.entryTSDirFromHTMLDir, `${window.name}.ts`),
        );
        writeFileSync(
          resolve(pluginOptions.htmlDir, `_${window.name}.html`),
          readFileSync(resolve(window.templateHTMLFile))
            .toString()
            .replace(
              /___TS_FILE___/,
              join(pluginOptions.entryTSDirFromHTMLDir, window.name + ".ts"),
            ),
        );
      });
    },
    config(config) {
      if (config.build?.rollupOptions) {
        config.build.rollupOptions.input = {
          ...(config.build.rollupOptions.input as any),
          ...pluginOptions.windows.reduce<{ [key: string]: string }>(
            (obj, window) => ({
              ...obj,
              [window.name]: resolve(pluginOptions.htmlDir, `_${window.name}.html`),
            }),
            {},
          ),
        };
        console.log(config.build.rollupOptions.input);
      }
    },
  };
};
