const packageJSON = require("./package.json");
const { defineConfig } = require("@vue/cli-service");
const fs = require("fs");
const path = require("path");
const files = require("./files.config");
const pages = fs
  .readdirSync(files.input.renderer.windowsRoot)
  .filter((name) => !name.startsWith("@") && name.endsWith(".ts"))
  .map((name) => name.replace(/\.ts/g, ""))
  .reduce((pages, name) => {
    return {
      ...pages,
      [name]: {
        entry: path.join(files.input.renderer.windowsRoot, name + ".ts"),
        template: files.input.renderer.template,
        filename: name + ".html",
      },
    };
  }, {});
const windowTypes = fs
  .readFileSync(files.input.renderer.windowTypes)
  .toString()
  .match(/"(.*?)"/g)
  .map((name) => name.replace(/"/g, ""));
if (windowTypes.sort().join() !== Object.keys(pages).sort().join()) {
  console.error(
    `Error: ${files.input.renderer.windowTypes} or ${files.input.renderer.windowsRoot} is wrong.`,
  );
  process.kill(0);
}
let appxConfig = null;
try {
  appxConfig = require(files.input.appxConfig);
} catch (err) {
  console.error(`Error: Could not build appx. '${files.input.appxConfig}' is not found.`);
}
module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  pages,
  chainWebpack: (config) => {
    config.optimization.delete("splitChunks");
    config.performance
      .maxEntrypointSize(16 * 1024 * 1024) // 16mb
      .maxAssetSize(16 * 1024 * 1024); // 16mb
    config.module
      .rule("vue")
      .use("vue-loader")
      .tap((options) => {
        options.hotReload = false;
        options.compilerOptions = {
          isCustomElement: (tag) => tag.startsWith("t-"),
        };
        return options;
      });
    config.module.rule("images").set("parser", {
      dataUrlCondition: {
        maxSize: 16 * 1024 * 1024, // 16mb
      },
    });
    config.module.rule("ts").exclude.add(/\.worker\.ts$/);
    config.module
      .rule("worker")
      .test(/\.worker\.ts$/)
      .use("worker-loader")
      .loader("worker-loader");
    config.module
      .rule("worker")
      .test(/\.worker\.ts$/)
      .use("ts-loader")
      .loader("ts-loader");
  },
  pluginOptions: {
    electronBuilder: {
      preload: {
        preload: files.input.main.preload,
      },
      mainProcessFile: files.input.main.index,
      outputDir: files.output.electron.appDir,
      chainWebpackMainProcess: (config) => {
        config.module
          .rule("images")
          .test(/\.(png)(\?.*)?$/)
          .use("url-loader")
          .loader("url-loader");
      },
      builderOptions: {
        appId: "io.takumus." + packageJSON.name,
        productName: packageJSON.productName,
        asar: true,
        directories: {
          buildResources: files.output.electron.resources.dir,
        },
        win: {
          icon: path.join(files.output.electron.resources.win.appIcon),
          target: ["nsis", ...(appxConfig ? ["appx"] : [])],
        },
        mac: {
          icon: path.join(files.output.electron.resources.mac.appIcon),
        },
        nsis: {
          oneClick: false,
          perMachine: true,
          allowToChangeInstallationDirectory: true,
          deleteAppDataOnUninstall: true,
        },
        protocols: {
          name: "image-petapeta-protocol",
          schemes: ["image-petapeta"],
        },
        ...appxConfig,
      },
    },
  },
});
