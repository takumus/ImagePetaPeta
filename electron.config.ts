import { Configuration } from "electron-builder";

export const electronConfiguration: Configuration = {
  appId: "io.takumus.imagepetapeta-beta",
  productName: "ImagePetaPeta-beta",
  asar: false,
  directories: {
    output: "_release",
  },
  electronDownload: {
    cache: "./_electronBuilderCache",
  },
  files: [
    {
      from: "_electronTemp/dist",
      to: "./",
    },
    "package.json",
  ],
  artifactName: "${productName}-${version}-${platform}-${arch}.${ext}",
  extraMetadata: {
    main: "main/index.js",
  },
  extraFiles: [
    {
      from: "_electronTemp/extraFiles",
      to: "extraFiles",
    },
  ],
  mac: {
    target: ["pkg", "dmg"],
    icon: "_electronTemp/app_icon_mac.png",
    cscInstallerLink: "takumus",
  },
  pkg: {
    isRelocatable: false,
    overwriteAction: "upgrade",
    allowAnywhere: false,
    mustClose: ["io.takumus.imagepetapeta-beta"],
  },
  win: {
    target: ["nsis"],
    icon: "_electronTemp/app_icon_win.ico",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
  },
};
