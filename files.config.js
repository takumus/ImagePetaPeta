module.exports = {
  input: {
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
  output: {
    electron: {
      appDir: "./dist/electron",
      resources: {
        dir: "./dist/electron_resources",
        win: {
          appIcon: "./dist/electron_resources/WindowsIcon.ico",
        },
        mac: {
          appIcon: "./dist/electron_resources/MacIcon.png",
        },
      },
    },
    testDir: "./dist/test",
  },
};
