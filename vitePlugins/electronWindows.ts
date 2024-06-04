import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { styleText } from "node:util";
import { BuildOptions, mergeConfig, Plugin, UserConfig } from "vite";

export default (pluginOptions: {
  templateHTMLFile: string;
  windows: {
    ts: string;
    virtualHTML: string;
  }[];
}): Plugin => {
  let root = "";
  const templateHTML = readFileSync(pluginOptions.templateHTMLFile, "utf-8");
  function getWindow(path: string) {
    const window = pluginOptions.windows.find(
      (window) => resolve(root, window.virtualHTML) === resolve(root, path),
    );
    return window;
  }
  function createHTML(url: string) {
    const window = getWindow(url);
    if (!window) {
      return;
    }
    const path = relative(resolve(root, dirname(window.virtualHTML)), resolve(root, window.ts));
    // console.log(path);
    return templateHTML.replace(/___TS_FILE___/, path);
  }
  return {
    name: "electronWindow",
    enforce: "pre",
    config(config) {
      root = config.root ?? ".";
      config.build = mergeConfig<BuildOptions, BuildOptions>(config.build ?? {}, {
        rollupOptions: {
          input: pluginOptions.windows.map((window) => window.virtualHTML),
        },
      });
      log("virtual htmls", config.build?.rollupOptions?.input);
    },
    resolveId(source) {
      if (getWindow(source) !== undefined) {
        return source;
      }
    },
    load(id) {
      const windowHTML = createHTML(id);
      if (windowHTML !== undefined) {
        log("export", id);
        return windowHTML;
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req?.url === undefined) {
          next();
          return;
        }
        const path = req.url.replace(/^[\\/]/, "");
        const windowHTML = createHTML(path);
        if (windowHTML === undefined) {
          next();
          return;
        }
        res.writeHead(200, {
          "Content-Type": "text/html, charset=utf-8",
          "Cache-Control": "no-cache",
        });
        log("serve", new URL(req.url, process.env.VITE_DEV_SERVER_URL).href, "->", path);
        res.end(windowHTML);
      });
    },
  };
};
function log(...args: any[]) {
  console.log(styleText("yellowBright", "[vite-plugin:electronWindows]"), ...args);
}
