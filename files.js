module.exports = {
  windowTypes: "./src/commons/datas/windowType.ts",
  renderer: {
    windowsRoot: "./src/rendererProcess/windows",
    template: "./src/rendererProcess/template.html",
  },
  main: {
    preload: "./src/mainProcess/preload.ts",
    main: "./src/mainProcess/index.ts",
  },
  out: {
    resourcesDir: "./dist/resources",
    electronDir: "./dist/electron",
    testDir: "./dist/test",
  },
  appxConfig: "./electron.config.appx.js",
};
