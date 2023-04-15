import { Configuration } from "electron-builder";

export const electronConfiguration: Configuration = {
  appId: "io.takumus.imagepetapeta-beta",
  productName: "ImagePetaPeta-beta",
  asar: true,
  directories: {
    output: "release",
  },
  files: ["dist"],
  artifactName: "${productName}-${version}-${platform}-${arch}.${ext}",
  extraFiles: [
    {
      from: "resources/electron/extraFiles",
      to: "extraFiles",
      filter: ["**/*"],
    },
  ],
  mac: {
    target: [
      {
        target: "dmg",
      },
    ],
    icon: "resources/electron/app_icon_mac.png",
  },
  win: {
    target: [
      {
        target: "nsis",
      },
    ],
    icon: "resources/electron/app_icon_win.ico",
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: true,
  },
};
