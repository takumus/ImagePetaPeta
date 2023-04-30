import { Configuration } from "electron-builder";

export const electronConfiguration: Configuration = {
  appId: "io.takumus.imagepetapeta-beta",
  productName: "ImagePetaPeta-beta",
  asar: true,
  directories: {
    output: "release",
  },
  electronDownload: {
    cache: "./.electron-builder-cache",
  },
  files: [
    {
      from: "electronTemp/dist",
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
      from: "electronTemp/extraFiles",
      to: "extraFiles",
    },
  ],
  mac: {
    target: [
      {
        target: "pkg",
      },
    ],
    icon: "electronTemp/app_icon_mac.png",
    cscInstallerLink: "takumus",
  },
  pkg: {
    overwriteAction: "upgrade",
    mustClose: ["io.takumus.imagepetapeta-beta"],
  },
  win: {
    target: [
      {
        target: "nsis",
      },
    ],
    icon: "electronTemp/app_icon_win.ico",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
  },
};
