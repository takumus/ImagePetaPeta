module.exports = {
  in: {
    renderer: {
      windowTypes: "./src/commons/datas/windowType.ts",
      windowsRoot: "./src/rendererProcess/windows",
      template: "./src/rendererProcess/template.html",
    },
    main: {
      preload: "./src/mainProcess/preload.ts",
      index: "./src/mainProcess/index.ts",
    },
    appxConfig: "./electron.config.appx.js",
  },
  out: {
    electronResourcesDir: "./dist/electron_resources",
    electronDir: "./dist/electron",
    testDir: "./dist/test",
  },
};
