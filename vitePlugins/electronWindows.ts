import { readFileSync } from "node:fs";
import { join } from "node:path";
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
  function extractSubstring(url: string) {
    return url.match(/[\\/]htmls[\\/]_(.*?)\.html$/)?.[1];
  }
  return {
    name: "electronWindow",
    enforce: "pre",
    resolveId(source) {
      const windowName = extractSubstring(source);
      if (windowName !== undefined) {
        return source;
      }
    },
    load(id) {
      const path = id.replace(/\\/g, "/");
      const windowName = extractSubstring(path);
      if (windowName !== undefined) {
        return createHTML(windowName);
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const windowName = extractSubstring(req?.url ?? "");
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
              [window.name]: join(pluginOptions.htmlDir, `_${window.name}.html`),
            }),
            {},
          ),
        };
        console.log(config.build.rollupOptions.input);
      }
    },
  };
};
