import { Configuration } from "electron-builder";

export const electronConfiguration: Configuration = {
  appId: "io.takumus.imagepetapeta-beta",
  productName: "ImagePetaPeta-beta",
  asar: true,
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
    main: "main/index.mjs",
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
    include: "./electron.installer.nsh",
  },
  asarUnpack: ["**/node_modules/sharp/**/*", "**/node_modules/@img/**/*"],
};
