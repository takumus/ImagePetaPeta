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
      crop: "切り取り",
      flipHorizontal: "左右反転",
      flipVertical: "上下反転",
      reset: "リセット",
      remove: "削除"
    }
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
  }
};
export default ja;