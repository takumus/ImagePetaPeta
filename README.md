# ImagePetaPeta-beta

<img src="https://user-images.githubusercontent.com/15127636/235609501-165ceda9-d54a-4794-8935-ea31ea14c9b6.png" width="100%">

写真やイラスト資料を閲覧、管理するソフトです！

## インストール

### Windows

下記より zip ファイル **(ImagePetaPeta-beta-X.X.X-beta-win32-x64.exe.zip)** をダウンロードしてインストールしてください。  
<https://github.com/takumus/ImagePetaPeta/releases/>  
下図ような警告が出ますが、赤い枠のボタンを押せばインストールできます。  
<img src="https://user-images.githubusercontent.com/15127636/235609515-de3a4aea-b872-42ba-8c98-2a985d8ce9bf.png" width="49%"><img src="https://user-images.githubusercontent.com/15127636/235609517-74254458-38f7-4241-862a-01b08a94ff82.png" width="49%">

### Mac

下記より dmg ファイル **(ImagePetaPeta-beta-X.X.X-beta-darwin-YYY.dmg)** をダウンロードして Applications にドラッグしてください。  
**`YYY` は、M1 や M2 等をお使いの場合は arm64 を、それ以外の方は Intel を選んでください。**  
<https://github.com/takumus/ImagePetaPeta/releases/>

#### 1. ダウンロードしたファイルを開きアプリケーションへドラッグします。

<img src="https://user-images.githubusercontent.com/15127636/235609508-746019cf-c00f-40ba-b23f-b067f5eb7952.jpg" width="50%">

#### 2. ランチャー等からアプリを起動します。しかし開けないので、左のボタンを押しファインダーで開きます。

<img src="https://user-images.githubusercontent.com/15127636/235609509-0ec7c18b-479a-49dc-9794-e6a4519ab2b5.jpg" width="50%">

#### 3. アプリをダブルクリックではなく、右クリックで開きます。

<img src="https://user-images.githubusercontent.com/15127636/235609512-098218e6-1298-4ceb-bad6-6ec86dab5f9b.jpg" width="50%">

#### 4. 開くを押せば起動できます。

<img src="https://user-images.githubusercontent.com/15127636/235609513-1e2a7a30-748c-4532-837b-897874993ccf.jpg" width="50%">

## ご協力

まだ開発段階のアプリなので、多くのユーザーに最新版を使っていただき、新鮮なフィードバックを貰いたいと思っております。  
そのため、アップデートの通知はオフにできないようになっています。  
よろしくお願いします。

## バグ発見！質問！または要望！

<https://docs.google.com/forms/d/e/1FAIpQLSfMVEzYwdC09SrM6ipTtHyk_wTC1n08pB2eeZIVZifIRW7ojQ/viewform>  
こちらのフォームからお願いします。  
github アカウントをお持ちの方は、Issues でも OK です。

# 開発者向け

## node とかのバージョン

`./package.json`の最後の`volta`を御覧ください。

## デバッグ

```
npm run dev
```

## ビルド

```
npm run build
```

## テスト

```
npm run test
```

```
npm run test-ui
```
