# ImagePetaPeta-beta
<img src="./README/app01.png" width="256px"><img src="./README/app02.png" width="256px">  
写真やイラスト資料を閲覧、管理するソフトです。
## インストール
### Windows
下記よりzipファイルをダウンロードしてインストールしてください。  
<https://github.com/takumus/ImagePetaPeta/releases/tag/2.2.2-beta>  
下図ような警告が出ますが、赤い枠のボタンを押せばインストールできます。  
<img src="./README/install01.png" width="256px">
<img src="./README/install02.png" width="256px">
### Mac
1. `package.json`の`volta`のバージョンを参考に`node`, `yarn`の環境を整えてください。  
1. [Volta](https://docs.volta.sh/guide/getting-started)をインストールでもOKです。  
2. `yarn build`  
3. `dist_electron`内に生成されたappファイルがアプリ本体です。
## ご協力
ベータ版ではバグの早期発見のためログファイルを保存しています。  
ログファイルの場所は、右上の**情報**ボタンより、**コンフィグフォルダ**を押していただき、**ImagePetaPeta-beta**フォルダの中の**logs**です。  
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
