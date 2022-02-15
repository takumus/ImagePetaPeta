const fs = require("fs");
const packageJSON = JSON.parse(fs.readFileSync("./package.json"));
let appxConfig = null;
try {
  appxConfig = require("./electron.config.appx.js");
} catch (err) {
  console.error("Cannot build appx. './electron.config.appx.js' is not found.");
}
module.exports = {
  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap(options => {
        options.hotReload = false
        return options
      });
    config.module
      .rule('images')
      .test(/\.(png)(\?.*)?$/)
      .use('url-loader')
      .options({
        limit: 0,
        name: `assets/[name].[hash].[ext]`
      });
  },
  productionSourceMap: false,
  pluginOptions: {
    electronBuilder: {
      preload: 'src/preload.ts',
      builderOptions: {
        appId: "io.takumus." + packageJSON.name,
        productName: packageJSON.productName,
        asar: true,
        win: {
          icon: "build/icon.ico",
          target: ["nsis", ...(appxConfig ? ["appx"] : [])]
        },
        mac: {
           icon: "icon/icon.png"
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true
        },
        ...appxConfig
      }
    }
  }
}