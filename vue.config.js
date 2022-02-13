const fs = require("fs");
const packageJSON = JSON.parse(fs.readFileSync("./package.json"));
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
        appId: "io.takumus.imagepetapeta-beta",
        productName: packageJSON.productName,
        asar: true,
        win: {
          icon: "build/icon.ico",
          target: ["nsis"]
        },
        mac: {
          // icon: "build/logo.png"
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true
        }
      }
    }
  }
}