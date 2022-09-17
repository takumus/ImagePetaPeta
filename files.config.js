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
        extraFiles: "./extraFiles",
        iconsDir: "./appIcons",
        win: {
          appIcon: "./appIcons/app_icon_win.ico",
        },
        mac: {
          appIcon: "./appIcons/app_icon_mac.png",
        },
      },
    },
    testDir: "./dist/test",
  },
};
