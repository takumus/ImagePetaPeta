const ja = {
  hello: "こんにちは",
  shared: {
    yes: "はい",
    no: "いいえ",
    closeButton: "閉じる",
  },
  utils: {
    updateDialog: (ctx: any) => {
      return `新しいアップデートがあります。\n現在のバージョン:${ctx.list(0)}\n最新のバージョン:${ctx.list(1)}\nダウンロードしますか？`;
    }
  },
  home: {
    infoButton: "情報",
    settingsButton: "設定",
    importImagesButton: "画像を読み込む",
    openBrowserButton: "ブラウザを開く"
  },
  boards: {
    removeDialog: (ctx: any) => {
      return `ボード"${ctx.list(0)}"を削除しますか？`
    },
    menu: {
      openBrowser: "ブラウザを開く",
      resetPosition: "位置をリセット"
    },
    panelMenu: {
      crop: "トリミング",
      flipHorizontal: "左右反転",
      flipVertical: "上下反転",
      reset: "リセット",
      remove: "削除"
    },
    loadManyImageDialog: (ctx: any) => {
      return `このボードには${ctx.list(0)}枚の大量の画像が存在します。\n場合によってはメモリ不足になりますが、読み込みますか？`
    },
    addManyImageDialog: (ctx: any) => {
      return `${ctx.list(0)}枚の画像をボードに追加しますか？`
    },
  },
  browser: {
    tagMenu: {
      remove: (ctx: any) => {
        return `タグ"${ctx.list(0)}"を削除`
      },
    },
    petaImageMenu: {
      remove: (ctx: any) => {
        return `${ctx.list(0)}"枚の画像を削除`
      },
    },
    removeImageDialog: (ctx: any) => {
      return `${ctx.list(0)}"枚の画像を削除しますか？`
    },
    removeTagDialog: (ctx: any) => {
      return `タグ"${ctx.list(0)}"を削除しますか？`
    },
    tagAlreadyExistsDialog: (ctx: any) => {
      return `タグ"${ctx.list(0)}"はすでに存在します`
    },
    property: {
      clickToAddTag: "クリックでタグ追加",
      selectedImage: (ctx: any) => {
        return `${ctx.list(0)}枚の画像を選択中`
      },
      tagMenu: {
        remove: (ctx: any) => {
          return `タグ"${ctx.list(0)}"を削除`
        },
      },
      clearSelectionButton: "選択解除",
      clearSelectionDialog: "選択解除しますか？",
      tags: "タグ一覧"
    },
    untagged: "タグ未設定",
    all: "すべて"
  },
  tab: {
    menu: {
      remove: (ctx: any) => {
        return `ボード"${ctx.list(0)}"を削除`
      }
    }
  },
  info: {
    githubButton: "Github",
    issuesButton: "バグ/要望",
    dbFolderButton: "データベースフォルダ",
    licenses: "ライセンス情報"
  },
  settings: {
    settings: "設定",
    lowMemoryMode: "省メモリモード",
    lowMemoryModeDescriptions: "フルサイズ画像をキャッシュしないため、メモリの使用量は少なくなりますが、画像の拡大縮小等でカクつきが発生します。",
    darkMode: "ダークモード",
    alwaysOnTop: "常に手前に表示",
    enableHardwareAcceleration: "GPUレンダリング",
    enableHardwareAccelerationDescriptions: "GPUを使って高速にレンダリング出来ますが、大量の画像を読み込んだ場合に表示が崩れる事があります。\n変更後はアプリの再起動が必要です！",
  }
};
export default ja;