module.exports = {
  input: {
    renderer: {
      windowTypes: "./src/commons/datas/windowType.ts",
      windowsRoot: "./src/renderer/windows",
      template: "./src/renderer/template.html",
    },
    main: {
      preload: "./src/main/preload.ts",
      index: "./src/main/index.ts",
    },
    appxConfig: "./electron.config.appx.js",
  },
  output: {
    electron: {
      appDir: "./dist/electron",
      resources: {
        tempExtraFiles: "./.temp/extraFiles",
        extraFiles: "./extraFiles",
        iconsDir: "./.temp/appIcons",
        win: {
          appIcon: "./.temp/appIcons/app_icon_win.ico",
        },
        mac: {
          appIcon: "./.temp/appIcons/app_icon_mac.png",
        },
      },
    },
    chromeExtension: {
      iconsDir: "./chromeExtension/",
    },
    tempDir: "./.temp",
    testDir: "./dist/test",
  },
};
