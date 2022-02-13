# ImagePetaPeta
<img src="./icon/icon.png" width="128px">

お絵かき屋さんのための、画像閲覧、管理ソフト。PureRefのような物です。
## ダウンロード
下記urlのzipファイルをダウンロードしてください。  
<https://github.com/takumus/ImagePetaPeta/releases/tag/1.5.4-beta>
## インストール
下図ような警告が出ますが、赤い枠のボタンを押せばインストールできます。  
<img src="./README/1.png" width="256px">
<img src="./README/2.png" width="256px">  

## ご協力
ベータ版ではバグの早期発見のためログファイルを保存しています。  
ログファイルの場所は、左下の**情報**より、**データベースフォルダ**で開いたフォルダ内の**logs.log**です。  
自動でオンラインにアップロードしたりする事は無いのでご安心ください。  
このソフトは、起動時のアップデートチェック・ブラウザからの画像追加以外でオンラインに接続しません。
## バグ発見！質問！または要望！
<https://github.com/takumus/ImagePetaPeta/issues>  
こちらより**New Issue**で投稿してください。  
githubアカウントが無い場合は<https://github.com/takumus>のメールアドレスまで！
# 開発者向け
## nodeとかのバージョン
`./package.json`の最後の`volta`を御覧ください。
## デバッグ
```
yarn serve
```

## ビルド
```
yarn build
```
