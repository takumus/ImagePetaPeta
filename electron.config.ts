import { Configuration } from "electron-builder";

export const electronConfiguration: Configuration = {
  appId: "io.takumus.imagepetapeta-beta",
  productName: "ImagePetaPeta-beta",
  asar: true,
  directories: {
    output: "release",
  },
  files: ["dist"],
  extraFiles: [
    {
      from: "resources/electron/extraFiles",
      to: "extraFiles",
      filter: ["**/*"],
    },
  ],
  mac: {
    artifactName: "${productName}-${version}-${platform}-${arch}.${ext}",
    target: ["dmg"],
    icon: "resources/electron/app_icon_mac.png",
  },
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
    icon: "resources/electron/app_icon_win.ico",
    artifactName: "${productName}-${version}-${platform}-${arch}.${ext}",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
  },
};
