import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Plugin } from "vite";

export default (pluginOptions: {
  templateHTMLFile: string;
  htmlDir: string;
  entryTSDirFromHTMLDir: string;
  windows: { name: string }[];
}): Plugin => {
  const templateHTML = readFileSync(pluginOptions.templateHTMLFile, "utf-8");
  function createHTML(windowName: string) {
    return templateHTML.replace(
      /___TS_FILE___/,
      join(pluginOptions.entryTSDirFromHTMLDir, `${windowName}.ts`),
    );
  }
  function getWindowName(url: string) {
    return url.match(/[\\/]htmls[\\/]page\.(.*?)\.html$/)?.[1];
  }
  return {
    name: "electronWindow",
    enforce: "pre",
    resolveId(source) {
      const windowName = getWindowName(source);
      if (windowName !== undefined) {
        return source;
      }
    },
    load(id) {
      const windowName = getWindowName(id);
      if (windowName !== undefined) {
        return createHTML(windowName);
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const windowName = getWindowName(req?.url ?? "");
        if (windowName === undefined) {
          next();
          return;
        }
        res.writeHead(200, {
          "Content-Type": "text/html, charset=utf-8",
          "Cache-Control": "no-cache",
        });
        res.end(createHTML(windowName));
      });
    },
    config(config) {
      if (config.build?.rollupOptions) {
        config.build.rollupOptions.input = {
          ...(config.build.rollupOptions.input as any),
          ...pluginOptions.windows.reduce<{ [key: string]: string }>(
            (obj, window) => ({
              ...obj,
              [window.name]: resolve(pluginOptions.htmlDir, `page.${window.name}.html`),
            }),
            {},
          ),
        };
        console.log(config.build.rollupOptions.input);
      }
    },
  };
};
