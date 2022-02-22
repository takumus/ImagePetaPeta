const packageJSON = require("./package.json");
let appxConfig = null;
try {
  appxConfig = require("./electron.config.appx.js");
} catch (err) {
  console.error("Cannot build appx. './electron.config.appx.js' is not found.");
}
module.exports = {
  chainWebpack: config => {
    config
      .entry("app")
      .clear();
    config
      .entry("app")
      .add("./src/rendererProcess/vue.ts");
    config.module
      .rule("vue")
      .use("vue-loader")
      .tap(options => {
        options.hotReload = false
        return options
      });
    config.module
      .rule("images")
      .test(/\.(png)(\?.*)?$/)
      .use("url-loader")
      // .options({
      //   limit: 8192,
      //   name: `assets/[name].[hash].[ext]`
      // });
  },
  productionSourceMap: false,
  pluginOptions: {
    electronBuilder: {
      preload: "./src/mainProcess/preload.ts",
      mainProcessFile: "./src/mainProcess/background.ts",
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
           icon: "icon/icon.png"
        },
        nsis: {
          oneClick: false,
          perMachine: true,
          allowToChangeInstallationDirectory: true
        },
        ...appxConfig
      }
    }
  }
}