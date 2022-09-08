const { defineConfig } = require("@vue/cli-service");
const pages = require("./vue.config.pages.js");
const chainWebpackRendererProcess = require("./vue.config.webpack.renderer");
const chainWebpackMainProcess = require("./vue.config.webpack.main");
const electronBuilder = require("./vue.config.electron-builder");
module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  pages,
  pluginOptions: {
    electronBuilder: {
      chainWebpackRendererProcess,
      chainWebpackMainProcess,
      ...electronBuilder,
    },
  },
});
