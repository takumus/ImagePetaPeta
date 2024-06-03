import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { styleText } from "node:util";
import { BuildOptions, mergeConfig, Plugin, UserConfig } from "vite";

export default (pluginOptions: {
  templateHTMLFile: string;
  virtualDirFromRoot: string;
  windows: { [name: string]: string };
}): Plugin => {
  let root = "";
  const templateHTML = readFileSync(pluginOptions.templateHTMLFile, "utf-8");
  function createHTML(windowName: string) {
    const path = relative(
      join(root, pluginOptions.virtualDirFromRoot),
      pluginOptions.windows[windowName],
    );
    return templateHTML.replace(/___TS_FILE___/, path);
  }
  function getWindowName(url: string) {
    return url.match(/[\\/]window\.(.*?)\.html$/)?.[1];
  }
  return {
    name: "electronWindow",
    enforce: "pre",
    config(config) {
      root = config.root ?? ".";
      config.build = mergeConfig<BuildOptions, BuildOptions>(config.build ?? {}, {
        rollupOptions: {
          input: Object.keys(pluginOptions.windows).map((windowName) =>
            join(root, pluginOptions.virtualDirFromRoot, `window.${windowName}.html`),
          ),
        },
      });
      log("virtual htmls", config.build?.rollupOptions?.input);
    },
    resolveId(source) {
      const windowName = getWindowName(source);
      if (windowName !== undefined) {
        return source;
      }
    },
    load(id) {
      const windowName = getWindowName(id);
      if (windowName !== undefined) {
        log("export", join(id));
        return createHTML(windowName);
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req?.url === undefined) {
          next();
          return;
        }
        const windowName = getWindowName(req.url ?? "");
        if (windowName === undefined) {
          next();
          return;
        }
        res.writeHead(200, {
          "Content-Type": "text/html, charset=utf-8",
          "Cache-Control": "no-cache",
        });
        log("serve", join(req.url));
        res.end(createHTML(windowName));
      });
    },
  };
};
function log(...args: any[]) {
  console.log(styleText("yellowBright", "[vite-plugin:electronWindows]"), ...args);
}
