# 起動

`yarn dev`  
一瞬エラーダイアログ出るかもしれない。これは速さの問題。

# 階層

## メインプロセス

`src/main`

## preload

`src/main/preload.ts`

## レンダラプロセス

`src/renderer`

## レンダラメイン共通

`src/commons`

# メインプロセスで ESModules のみ対応ライブラリに対応。

## vite-plugin-esmodule

これをつかって対応しつつ  
`devDependencies`を除外したものを対象にしたり、  
`rollupOptions.external`から除外したり、いろいろしている。

# 完全型安全の WebWorker, node:worker_threads に対応。

## 仕組み

`vitePlugins`に変換マシン。それが頑張ってる。  
`node:worker_threads` のみ、`vite.config.ts` への追記が必要。  
いずれプラグインを頑張って自動化する。

# マルチウインドウに対応。

## Window の追加

各々編集してください。  
`src/commons/windows.ts`にウインドウ名を追記。  
`src/renderer/windows/`にウインドウ名と同名の ts ファイルを作成。

## 仕組み

`src/renderer/htmls/$template.html`はすべてのウインドウのテンプレート。  
ビルド時に、それをウインドウ名分`src/renderer/htmls`へ`.html`を作成してくれる。  
`vitePlugins/electronWindows`というプラグインを作った。  
`vite`はエントリーになる`html`の実態がないとだめっぽいので、将来的に、バーチャルでエントリーを指定できるようになれば嬉しい！
