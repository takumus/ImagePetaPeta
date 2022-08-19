const packageJSON = require("./package.json");
const { defineConfig } = require("@vue/cli-service");
const fs = require("fs");
const path = require("path");
const files = require("./files.config");
const pages = fs
  .readdirSync(files.in.renderer.windowsRoot)
  .filter((name) => !name.startsWith("@") && name.endsWith(".ts"))
  .map((name) => name.replace(/\.ts/g, ""))
  .reduce((pages, name) => {
    return {
      ...pages,
      [name]: {
        entry: path.join(files.in.renderer.windowsRoot, name + ".ts"),
        template: files.in.renderer.template,
        filename: name + ".html",
      },
    };
  }, {});
const windowTypes = fs
  .readFileSync(files.in.renderer.windowTypes)
  .toString()
  .match(/"(.*?)"/g)
  .map((name) => name.replace(/"/g, ""));
if (windowTypes.sort().join() !== Object.keys(pages).sort().join()) {
  console.error(`Error: ${files.in.renderer.windowTypes} or ${files.in.renderer.windowsRoot} is wrong.`);
  process.kill(0);
}
let appxConfig = null;
try {
  appxConfig = require(files.in.appxConfig);
} catch (err) {
  console.error(`Error: Could not build appx. '${files.in.appxConfig}' is not found.`);
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
      preload: files.in.main.preload,
      mainProcessFile: files.in.main.index,
      outputDir: files.out.electronDir,
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
          buildResources: files.out.electronResourcesDir,
        },
        win: {
          icon: path.join(files.out.electronResourcesDir, "WindowsIcon.ico"),
          target: ["nsis", ...(appxConfig ? ["appx"] : [])],
        },
        mac: {
          icon: path.join(files.out.electronResourcesDir, "MacIcon.png"),
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
