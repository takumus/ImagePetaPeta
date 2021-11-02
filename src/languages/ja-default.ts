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
    imageLoadError: "画像読み込みエラー",
    loadManyImageDialog: (ctx: any) => {
      return `このボードには${ctx.list(0)}枚の大量の画像が存在します。\n場合によってはメモリ不足になりますが、読み込みますか？`
    },
    addManyImageDialog: (ctx: any) => {
      return `${ctx.list(0)}枚の画像をボードに追加しますか？`
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
  },
  settings: {
    settings: "設定",
    lowMemoryMode: "省メモリモード",
    lowMemoryModeDescriptions: "このバージョンでは、省メモリモードの設定は意味がありません。",
    darkMode: "ダークモード",
    alwaysOnTop: "常に手前に表示",
    enableHardwareAcceleration: "GPUレンダリング",
    enableHardwareAccelerationDescriptions: "GPUを使って高速にレンダリング出来ます。無効にした場合、大幅にパフォーマンスが落ちます。\n変更後は再起動が必要です。",
    showFPS: "フレームレートを表示",
    showFPSDescriptions: "右下に表示されます。大体60fps出ていれば問題ありません。\n著しく低い場合はご連絡ください。",
    zoomSensitivity: "ズーム感度",
    moveSensitivity: "移動感度(Macのみ)"
  }
};
export default ja;