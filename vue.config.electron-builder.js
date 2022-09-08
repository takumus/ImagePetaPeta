const packageJSON = require("./package.json");
const files = require("./files.config.js");
const path = require("path");
let appxConfig = null;
try {
  appxConfig = require(files.input.appxConfig);
} catch (err) {
  console.error(`Error: Could not build appx. '${files.input.appxConfig}' is not found.`);
}
module.exports = {
  preload: {
    preload: files.input.main.preload,
    // "workers/generateMetadata.worker-threads":
    //   "./src/mainProcess/workers/generateMetadata.worker-threads.ts",
  },
  mainProcessFile: files.input.main.index,
  outputDir: files.output.electron.appDir,
  builderOptions: {
    appId: "io.takumus." + packageJSON.name,
    productName: packageJSON.productName,
    asar: true,
    directories: {
      buildResources: files.output.electron.resources.dir,
    },
    win: {
      icon: path.join(files.output.electron.resources.win.appIcon),
      target: ["nsis", ...(appxConfig ? ["appx"] : [])],
    },
    mac: {
      icon: path.join(files.output.electron.resources.mac.appIcon),
    },
    nsis: {
      oneClick: false,
      perMachine: true,
      allowToChangeInstallationDirectory: true,
      deleteAppDataOnUninstall: true,
    },
    protocols: {
      name: "image-petapeta-protocol",
      schemes: ["image-petapeta"],
    },
    ...appxConfig,
  },
};
