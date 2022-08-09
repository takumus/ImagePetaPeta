const packageJSON = require("./package.json");
const { defineConfig } = require('@vue/cli-service')
const files = {
  renderer: {
    entry: "./src/rendererProcess/index.ts",
    template: "./src/rendererProcess/index.html"
  },
  main: {
    preload: "./src/mainProcess/preload.ts",
    main: "./src/mainProcess/index.ts"
  },
  appxConfig: "./electron.config.appx.js"
}
let appxConfig = null;
try {
  appxConfig = require(files.appxConfig);
} catch (err) {
  console.error(`Cannot build appx. '${files.appxConfig}' is not found.`);
}
module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  chainWebpack: config => {
    config.performance
      .maxEntrypointSize(16 * 1024 * 1024) // 16mb
      .maxAssetSize(16 * 1024 * 1024) // 16mb
    config
      .entry("app")
      .clear()
      .add(files.renderer.entry);
    config.plugin('html')
      .tap((args) => {
        args[0].template = files.renderer.template
        return args;
      })
    config.module
      .rule("vue")
      .use("vue-loader")
      .tap(options => {
        options.hotReload = false
        options.compilerOptions = {
          isCustomElement: (tag) => tag.startsWith("t-")
        }
        return options
      })
    config.module
      .rule("images")
      .set('parser', {
        dataUrlCondition: {
          // maxSize: 99999 * 1024 // 4KiB
        }
      })
    config.module
      .rule("worker")
      .test(/\.worker\.ts$/)
      .use("worker-loader")
      .loader("worker-loader")
    config.module
      .rule('ts')
      .exclude
      .add(/\.worker\.ts$/)
    config.module
      .rule("worker")
      .test(/\.worker\.ts$/)
      .use("ts-loader")
      .loader("ts-loader")
  },
  pluginOptions: {
    electronBuilder: {
      preload: files.main.preload,
      mainProcessFile: files.main.main,
      chainWebpackMainProcess: (config) => {
        config.module
          .rule('images')
          .test(/\.(png)(\?.*)?$/)
          .use('url-loader')
          .loader('url-loader')
      },
      builderOptions: {
        appId: "io.takumus." + packageJSON.name,
        productName: packageJSON.productName,
        asar: true,
        directories: {
          buildResources: "build",
          output: "dist_electron"
        },
        win: {
          icon: "build/icon.ico",
          target: ["nsis", ...(appxConfig ? ["appx"] : [])]
        },
        mac: {
           icon: "build/MacIcon.png"
        },
        nsis: {
          oneClick: false,
          perMachine: true,
          allowToChangeInstallationDirectory: true,
          deleteAppDataOnUninstall: true
        },
        protocols: {
          name: "image-petapeta-protocol",
          schemes: [
            "image-petapeta"
          ]
        },
        ...appxConfig
      }
    }
  }
});