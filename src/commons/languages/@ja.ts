import { I18NBase } from "@/commons/languages/@base";

export const ja: I18NBase = {
  hello: "こんにちは",
  titles: {
    details: "詳細",
    browser: "ブラウザ",
    board: "ボード",
    settings: "設定",
    capture: "キャプチャ",
    eula: "はじめにお読みください",
    quit: "終了中",
  },
  playbackController: {
    play: "再生",
    pause: "停止",
    volume: "音量",
    speed: "速度",
  },
  commons: {
    yes: "はい",
    no: "いいえ",
    closeButton: "閉じる",
  },
  utils: {
    downloadUpdateDialog: (ctx) => {
      return `新しいアップデートを発見しました!!!\n現在のバージョン: ${ctx.list(
        0,
      )}\n最新のバージョン: ${ctx.list(1)}\n手動でダウンロードしますか?`;
    },
  },
  utilsBar: {
    nsfwConfirm: "NSFWマークの付いた画像が表示されます。\nよろしいですか?",
  },
  home: {
    infoButton: "情報",
    settingsButton: "設定",
    importFilesFromFilesButton: "ファイル",
    importFilesFromDirectoriesButton: "フォルダ",
    openBrowserButton: "ブラウザ",
  },
  boards: {
    removeDialog: (ctx) => {
      return `ボード"${ctx.list(0)}"を削除しますか?`;
    },
    selectErrorBoardDialog: (ctx) => {
      return `前回、ボード"${ctx.list(
        0,
      )}"をロード中にアプリが終了されました。\nもう一度読み込みますか?`;
    },
    menu: {
      openBrowser: "ブラウザを開く",
      resetPosition: "位置をリセット",
    },
    panelMenu: {
      toFront: "最前面へ移動",
      toBack: "最背面へ移動",
      details: "詳細を見る",
      playGIF: "GIFを再生",
      stopGIF: "GIFを停止",
      playVideo: "動画を再生",
      stopVideo: "動画を停止",
      crop: "トリミング",
      flipHorizontal: "左右反転",
      flipVertical: "上下反転",
      reset: "リセット",
      remove: "削除",
    },
    addManyImageDialog: (ctx) => {
      return `${ctx.list(0)}枚の画像をボードに追加しますか?`;
    },
    crop: {
      apply: "適用",
      reset: "リセット",
      cancel: "キャンセル",
    },
    loading: "読込中...",
    extracting: "展開中...",
  },
  browser: {
    tagMenu: {
      remove: (ctx) => {
        return `タグ "${ctx.list(0)}" を削除`;
      },
    },
    tagPartitionMenu: {
      remove: (ctx) => {
        return `区切り "${ctx.list(0)}" を削除`;
      },
    },
    addTagPartition: `区切りを追加`,
    petaFileMenu: {
      remove: (ctx) => {
        return `${ctx.list(0)}枚の画像を削除`;
      },
      openFile: "画像ファイルの場所を開く",
      realESRGAN: "Real-ESRGANで変換する",
      searchImageByGoogle: "Googleで類似画像を検索",
    },
    removeImageDialog: (ctx) => {
      return `${ctx.list(0)}枚の画像を削除しますか?`;
    },
    removeTagDialog: (ctx) => {
      return `タグ "${ctx.list(0)}" を削除しますか?\n画像は削除されません。`;
    },
    removeTagPartitionDialog: (ctx) => {
      return `区切り "${ctx.list(0)}" を削除しますか?`;
    },
    tagAlreadyExistsDialog: (ctx) => {
      return `タグ" ${ctx.list(0)}" はすでに存在します`;
    },
    property: {
      clickToAddTag: "タグ追加",
      tagName: "タグ名",
      fetchingTags: "タグ取得中...",
      selectedImage: (ctx) => {
        return `${ctx.list(0)}枚の画像を選択中`;
      },
      tagMenu: {
        remove: (ctx) => {
          return `タグ"${ctx.list(0)}"を削除`;
        },
      },
      clearSelectionButton: "選択解除",
      openDetailsButton: "詳細",
      clearSelectionDialog: "選択解除しますか?",
      tags: "タグ",
      mutualTags: "共通のタグ",
      infos: {
        label: "基本情報",
        addDate: "追加日",
        fileDate: "変更日",
        note: "ノート",
        name: "名前",
        size: "サイズ",
        mimeType: "MIME",
      },
      colors: {
        label: "色",
      },
      nsfw: {
        label: "NSFW",
      },
    },
    untagged: "未分類",
    all: "すべて",
    grouping: "分割",
  },
  tab: {
    menu: {
      remove: (ctx) => {
        return `ボード "${ctx.list(0)}" を削除`;
      },
    },
  },
  info: {
    githubButton: "Github",
    issuesButton: "バグ/要望",
    dbFolderButton: "データベースフォルダ",
    configFolderButton: "コンフィグフォルダ",
    showEULAButton: "はじめにお読みください",
    licenses: "使用しているライブラリ情報",
    assets: "使用しているアセット情報",
    supporters: "サポーター",
  },
  settings: {
    settings: "設定",
    general: "基本",
    control: "操作",
    browser: "ブラウザ",
    datas: "データ",
    others: "その他",
    info: "情報",
    update: "アップデート",
    darkMode: "ダークモード",
    autoDarkMode: "ダークモードの自動検出",
    autoDarkModeDescriptions:
      "PCの設定がダークモードかどうかを判別し、本アプリのダークモードを自動で切り替えます。",
    alwaysOnTop: "常に手前に表示",
    show: "を起動時に表示する。",
    showBoard: "ボードのみ",
    showBrowser: "ブラウザのみ",
    showBoth: "ボードとブラウザ",
    showDescriptions: "アプリ起動時に表示する画面を設定できます。",
    alwaysOnTopDescriptions: "このアプリのウインドウを常に最前面に固定します。",
    showFPS: "フレームレートを表示",
    showFPSDescriptions: "開発者向けの機能です。",
    zoomSensitivity: "ズーム感度",
    zoomSensitivityDescriptions: "-100のように、頭にマイナスを付けると反転できます。",
    moveSensitivity: "移動感度(Macのみ)",
    moveSensitivityDescriptions: "-100のように、頭にマイナスを付けると反転できます。",
    autoHideUI: "非アクティブ時にUIを隠す",
    autoHideUIDescriptions: "別アプリを操作している時に、タブバーやボタン等のUIを自動で隠します。",
    regenerateMetadatasButton: "メタデータ再生成",
    regenerateMetadatasConfirm: "サムネイルの再生成には時間がかかりますが、よろしいですか?",
    regenerateMetadatasDescriptions:
      "サムネイルやメタデータを再生成します。バージョンアップなどで仕様が変わった時に再生成する必要があります。",
    loadTilesInOriginal: "ブラウザをズーム時にフルサイズの画像を読み込む。(高スペックPC向け)",
    loadTilesInOriginalDescriptions:
      "ブラウザでズームした時に、フルサイズの画像を読み込みます。動作が重いと感じた場合はチェックを外すと良いです。",
    showTagsOnTile: "タグを表示する",
    showTagsOnTileDescriptions: "タグが邪魔な場合・ブラウザが重い場合はチェックを外すと良いです。",
    alwaysShowNSFW: "NSFWな画像を常に表示",
    alwaysShowNSFWDescriptions: "NSFWとしてマークした画像を常に表示します。気をつけてくださいね。",
    browsePetaFileDirectoryButton: "データの保存先を選ぶ",
    changePetaFileDirectoryButton: "データの保存先を適用",
    changePetaFileDirectoryDescriptions: "このアプリの画像の保存先を変更できます。",
    updateAvailable: "新しいバージョンがあります。",
    thisIsLatest: "既に最新バージョンです。",
    latestVersion: "最新バージョン",
    currentVersion: "現在のバージョン",
    updateButton: "アップデートする",
    checkUpdateButton: "アップデート確認",
    releaseNoteButton: "リリースノートを確認",
    disableAcceleratedVideoDecode: "動画再生のGPUアクセラレーションを無効にする",
    disableAcceleratedVideoDecodeDescriptions:
      "動画が乱れたりカクついたりする場合は無効にしてみてください。動画再生時の全体的な動作は重くなりますが、動作の安定感は増します。変更後は再起動が必要です。",
    developerMode: "開発者モード",
    gamutMapSampling: "ガマットマップのサンプリング数",
    gamutMapSamplingDescriptions:
      "ガマットマップを作る際に読み込むピクセルの量です。最大は65536です。多くすればするほど重くなります。",
    developerModeDescriptions:
      "開発者モードを有効にすると51915ポートを使用し、ローカルにAPIサーバーを立てます。拡張機能を使う際は必須です。変更後は再起動が必要です。再起動後、ファイアウォールの許可が問われますので許可してください。",
    changePetaFileDirectoryDialog: (ctx) => {
      return `データの保存先を\n"${ctx.list(0)}"\nに変更しますか?\n"はい"を押すと再起動します。`;
    },
    changePetaFileDirectoryErrorDialog: (ctx) => {
      return `データの保存先を\n"${ctx.list(
        0,
      )}"\nに変更出来ませんでした。\n他のフォルダを選んでください。`;
    },
  },
  fileImporter: {
    cancel: "中止",
  },
  tasks: {
    error: {
      name: "エラー",
      logs: {
        begin: "",
        progress: "",
        complete: "",
        failed: (ctx) => {
          return `エラー: ${ctx.list(0)}`;
        },
      },
    },
    updateDatas: {
      name: "データを更新しています。",
      logs: {
        begin: "開始",
        progress: "更新中",
        complete: "完了",
        failed: "失敗",
      },
    },
    listingFiles: {
      name: "一覧を取得しています。",
      logs: {
        begin: "開始",
        progress: "取得中",
        complete: "完了",
        failed: "失敗",
      },
    },
    importingFiles: {
      name: "ファイルをインポートしています。",
      logs: {
        begin: "開始",
        progress: (ctx) => {
          return `${
            ctx.list(0) === "error" ? "エラー" : ctx.list(0) === "exists" ? "重複" : "追加"
          }:${ctx.list(1)}`;
        },
        complete: (ctx) => {
          return `${ctx.list(1)}件中${ctx.list(0)}件のインポートに成功しました。`;
        },
        failed: (ctx) => {
          return `${ctx.list(1)}件中${ctx.list(0)}件のインポートに成功しました。`;
        },
      },
    },
    upconverting: {
      name: "Real-ESRGANで変換しています。",
      logs: {
        begin: (ctx) => {
          return `${ctx.list(0)}枚の画像を変換します。`;
        },
        progress: (ctx) => {
          return `Real-ESRGAN: ${ctx.list(0)}`;
        },
        complete: "完了",
        failed: "失敗",
      },
    },
    searchImageByGoogle: {
      name: "検索URLを生成中。",
      logs: {
        begin: "開始",
        complete: "完了",
        failed: (ctx) => {
          return `失敗: ${ctx.list(0)}`;
        },
        progress: (ctx) => {
          return `${ctx.list(0)}`;
        },
      },
    },
  },
  eula: {
    body: `下記の(壱), (弐), (参), (肆), (伍), (陸)の内容ついて、\n全て分かった方は「分かった」を押してください。\n「分かった」方のみ本アプリを利用できます。\n\n(壱). バグとかで、突然データが消えたりすることが絶対に無いとは言えません。データ管理については結構慎重に開発したつもりですけど！もし問題が起きても、怒らないでください。\n\n(弐). あと、もしバグを見つけた時や、機能追加・改善等の要望がある場合は、設定画面の情報タブより報告してくれると、嬉しいです☺\n\n(参). 本アプリは、オープンソースです。プログラムの内容がすべて公開されていて、誰でも開発に参加できます。興味がある人は下記リポジトリを見てください。https://github.com/takumus/ImagePetaPeta\n\n(肆). NSFW機能は上手に使ってください。恥ずかしい思いをしないように。\n\n(伍). 本アプリを起動中の間、アップデートの確認のため、定期的にインターネットに接続します。\n\n(陸). ダウンロードしていただきありがとうございます！嬉しいです。`,
    agree: "分かった",
    disagree: "分からない",
  },
  quit: {
    quitting: "終了しています。",
  },
};
