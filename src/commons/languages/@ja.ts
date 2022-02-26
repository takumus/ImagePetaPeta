const ja = {
  hello: "こんにちは",
  shared: {
    yes: "はい",
    no: "いいえ",
    closeButton: "閉じる",
  },
  utils: {
    updateDialog: (ctx: any) => {
      return `新しいアップデートがあります。\n現在のバージョン:${ctx.list(0)}\n最新のバージョン:${ctx.list(1)}\nダウンロードしますか?`;
    }
  },
  home: {
    infoButton: "情報",
    settingsButton: "設定",
    importImagesFromFilesButton: "ファイル",
    importImagesFromDirectoriesButton: "フォルダ",
    openBrowserButton: "ブラウザ"
  },
  boards: {
    removeDialog: (ctx: any) => {
      return `ボード"${ctx.list(0)}"を削除しますか?`
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
      return `このボードには${ctx.list(0)}枚の大量の画像が存在します。\n場合によってはメモリ不足になりますが、読み込みますか?`
    },
    addManyImageDialog: (ctx: any) => {
      return `${ctx.list(0)}枚の画像をボードに追加しますか?`
    },
    loading: "読込中..."
  },
  browser: {
    tagMenu: {
      remove: (ctx: any) => {
        return `タグ"${ctx.list(0)}"を削除`
      },
    },
    petaImageMenu: {
      remove: (ctx: any) => {
        return `${ctx.list(0)}枚の画像を削除`
      },
      openImageFile: "画像ファイルの場所を開く"
    },
    removeImageDialog: (ctx: any) => {
      return `${ctx.list(0)}枚の画像を削除しますか?`
    },
    removeTagDialog: (ctx: any) => {
      return `タグ"${ctx.list(0)}"を削除しますか?\n画像は削除されません。`
    },
    tagAlreadyExistsDialog: (ctx: any) => {
      return `タグ"${ctx.list(0)}"はすでに存在します`
    },
    property: {
      clickToAddTag: "クリックでタグ追加",
      tagName: "タグ名",
      selectedImage: (ctx: any) => {
        return `${ctx.list(0)}枚の画像を選択中`
      },
      tagMenu: {
        remove: (ctx: any) => {
          return `タグ"${ctx.list(0)}"を削除`
        },
      },
      clearSelectionButton: "選択解除",
      clearSelectionDialog: "選択解除しますか?",
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
    general: "基本",
    control: "操作",
    browser: "ブラウザ",
    datas: "データ",
    others: "その他",
    darkMode: "ダークモード",
    autoDarkMode: "ダークモードの自動検出",
    autoDarkModeDescriptions: "PCの設定がダークモードかどうかを判別し、本アプリのダークモードを自動で切り替えます。",
    alwaysOnTop: "常に手前に表示",
    alwaysOnTopDescriptions: "このアプリのウインドウを常に最前面に固定します。",
    showFPS: "フレームレートを表示",
    showFPSDescriptions: "開発者向けの機能です。",
    zoomSensitivity: "ズーム感度",
    zoomSensitivityDescriptions: "-100のように、頭にマイナスを付けると反転できます。",
    moveSensitivity: "移動感度(Macのみ)",
    moveSensitivityDescriptions: "-100のように、頭にマイナスを付けると反転できます。",
    autoHideUI: "非アクティブ時にUIを隠す",
    autoHideUIDescriptions: "別アプリを操作している時に、タブバーやボタン等のUIを自動で隠します。",
    thumbnailsSize: "サムネイルサイズ",
    thumbnailsQuality: "サムネイル品質",
    thumbnailsRegenerateButton: "サムネイル再生成",
    thumbnailsRegenerateConfirm: "サムネイルの再生成には時間がかかりますが、よろしいですか?",
    thumbnailsDescriptions: "ブラウザ上のサムネイルの画質を設定します。数値を上げると、ブラウザでの見た目がきれいになりますが、動作が重くなる場合があります。設定変更後は再生成ボタンを押してください。",
    loadThumbnailsInFullsized: "ブラウザをズーム時にフルサイズの画像を読み込む。(高スペックPC向け)",
    loadThumbnailsInFullsizedDescriptions: "ブラウザでのサムネイルサイズが、上記で生成したサイズを超えた場合にフルサイズの画像を読み込みます。動作が重いと感じた場合は、この設定を無効にすることをおすすめします。",
    showNsfwWithoutConfirm: "NSFWな画像を表示",
    showNsfwWithoutConfirmDescriptions: "NSFWとしてマークした画像を常に表示します。気をつけてください。",
    browsePetaImageDirectoryButton: "データの保存先を選ぶ",
    changePetaImageDirectoryButton: "データの保存先を適用",
    changePetaImageDirectoryDescriptions: "このアプリの画像の保存先を変更できます。",
    autoAddTag: "自動タグ追加",
    autoAddTagDescriptions: "インポート時、自動で日付のタグを追加します。",
    changePetaImageDirectoryDialog: (ctx: any) => {
      return `データの保存先を"${ctx.list(0)}"に変更しますか?\n"はい"を押すと再起動します。`
    },
    changePetaImageDirectoryErrorDialog: (ctx: any) => {
      return `データの保存先を"${ctx.list(0)}"に変更出来ませんでした。\n他のフォルダを選んでください。`
    },
  },
  imageImporter: {
    importing: "画像ファイルを読込中..."
  }
};
export default ja;