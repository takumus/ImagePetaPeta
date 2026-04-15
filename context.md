ImagePetaPeta: Vue 3 → React 移行プラン

Context

ImagePetaPeta は Electron + Vue 3 + Vite 構成のデスクトップ画像ビューア/管理アプリ。レンダラ層のみ Vue 3
で実装されており、Electron main / commons / renderer の大半のロジック層は Vue 非依存。本プランは「レンダラ層を
React に全面置き換え、同時に Panda CSS を導入する」ための作業計画を示す。

背景:

- .vue ファイルは 61個（src/renderer/components/ 配下）、<script setup> 100% 採用
- Vuetify/Pinia/Vue Router など Vue エコシステムへのロックインはゼロ
- Teleport / Transition / provide-inject / カスタムディレクティブの使用もゼロで、変換困難な機能なし
- src/main/ (96 .ts) と src/commons/ (61 .ts) は Vue 非依存でそのまま流用可能

前提と制約（決定済み）

1.  移行方式: react-migration ブランチを切って並行開発し、一気にマージ。Vue/React 共存はしない
2.  スタイリング: Panda CSS を導入。<style scoped> と SCSS ファイルを全面書き換え
3.  状態管理: 現状の自前 DI コンテナ（src/renderer/initDI.ts）と create*/use* ストアパターンを継承。Vue
    のリアクティブ API (ref/computed/watch) を React Hooks (useState/useMemo/useEffect) に置き換える方式

フェーズ別作業計画

Phase 0: 基盤セットアップ

ゴール: React + Panda CSS で空のウィンドウがビルド・起動する状態。

- react-migration ブランチ作成
- vite.app.config.ts / vite.app.web.config.ts: @vitejs/plugin-vue → @vitejs/plugin-react へ差し替え
- tsconfig.json: "jsx": "preserve" → "jsx": "react-jsx"。package.json の vue-tsc を tsc --noEmit に変更
- 依存インストール: react, react-dom, @types/react, @types/react-dom, @vitejs/plugin-react, @pandacss/dev
- Panda CSS 設定作成: src/renderer/styles/styles.ts の ColorStyle / SizeStyle から 30+
  のデザイントークン（--color-0, --rounded, --px-1 等）を panda.config.ts のテーマに抽出
- ブートストラップ層の書き換え: src/renderer/windows/@base.ts (113行) — createApp(component).provide() を
  createRoot().render() + <StoreProvider> に置換
- src/renderer/stores/keyStoreCreatorPair.ts の Vue InjectionKey を React createContext に差し替え
- PoC として最小ウィンドウ（VWindowQuit.vue, 12行）を React 化して起動確認

検証: npm run dev:app 起動、quit ウィンドウが React コンポーネントとしてレンダ、Panda CSS クラスが適用される。

Phase 1: 共通部品の React 化

ゴール: 汎用小コンポーネント（21個程度）を全て React 化。

- src/renderer/utils/vue.ts（inject ラッパー, 10行）を useStore hook に置換
- src/renderer/libs/ipc.ts (54行): 無修正で流用（Proxy ベース、Vue 非依存）
- コンポーネントを依存ゼロから順に変換:
  a. VProgressBar.vue (35行), VCheckbox.vue (57行), VSlider.vue (127行)
  b. VTextarea, VSelect, VComplement, VTooltip, VContextMenu, VFloating, VModal
  c. VDragView, VSelectableBox（@vueuse/core の useMouseInElement, useRafFn は自作 hook or usehooks-ts で代替）
  d. VTitleBar, VHeaderBar, VPreview, VPIXI（pixi.js キャンバスラッパー）
- グローバル SCSS を Panda CSS に変換:
  - root.scss (52行) → Panda globalCss
  - windowRoot.scss, button.scss, color.scss, label.scss, sortHelper.scss → Panda recipes/utilities

Phase 2: ストア層の移行

ゴール: 20個の create*/use* ストアを React Context + Hooks で動作させる。

ストアを3カテゴリに分類して対応:

┌───────────────────┬────────────────────────────────────────┬──────────────────────────────────────────────┐
│ カテゴリ │ 対象 │ 変換方針 │
├───────────────────┼────────────────────────────────────────┼──────────────────────────────────────────────┤
│ │ appInfoStore, styleStore, nsfwStore, │ useState + useEffect で IPC │
│ 読み取り専用 IPC │ systemInfoStore, definesStore, │ リスナ登録。readonly(ref(...)) │
│ 同期 │ textsStore, windowNameStore, │ はセッター非公開の state に │
│ │ commonTextureStore │ │
├───────────────────┼────────────────────────────────────────┼──────────────────────────────────────────────┤
│ 双方向 IPC │ │ watch(deep:true) + unwatch/rewatch │
│ 同期（最難関） │ settingsStore, statesStore │ パターンを、useRef フラグで IPC 起因と UI │
│ │ │ 起因を区別する useEffect に書き換え │
├───────────────────┼────────────────────────────────────────┼──────────────────────────────────────────────┤
│ CRUD + │ petaFilesStore, petaTagsStore, │ useState で map 管理、useEffect の cleanup │
│ イベントエミッタ │ petaBoardsStore, │ で IPC 購読解除 │
│ │ petaTagPartitionsStore │ │
└───────────────────┴────────────────────────────────────────┴──────────────────────────────────────────────┘

非 DI ストア:

- useResizerStore (38行), useKeyboardsStore (11行), useImageImporterStore (149行) — onUnmounted cleanup は
  useEffect の return cleanup に機械的変換

src/renderer/contexts/StoreContext.tsx を新設し、@base.ts の app.provide() チェーンを単一 Provider に集約。

Phase 3: 大規模コンポーネントとウィンドウ殻

ゴール: 13ウィンドウ全てがレンダリングされる。

順序（複雑度の小さい順）:

1.  小: VWindowQuit(12), VWindowPassword(27), VWindowCapture(33), VWindowEula(50), VWindowTask(27),
    VWindowModal(40)
2.  中: VWindowLibraries(37), VWindowDetails(82), VWindowPageDownloader(44), VWindowSettings(37) + 設定サブ8個
3.  大:

- VWindowBrowser + VBrowser.vue (763行) — 分解必須
- VWindowBoard + VBoard.vue (454行) — pixi.js は imperative hook に隔離
- VTags.vue (416行), VProperty.vue (542行)

VBrowser.vue の分解方針:

- タイルレイアウト計算 → useTileLayout hook (~150行)
- コンテキストメニュー/ドラッグ処理 → useBrowserInteraction hook (~100行)
- ソート/フィルタ → useBrowserFilter hook (~100行)
- 残りの JSX コンポーネント ~150行（BrowserTileGrid, BrowserToolbar, BrowserSidebar に分離）

Phase 4: i18n・統合・仕上げ

- vue-i18n → react-i18next + i18next:
  - src/commons/languages/@ja.ts (341行) は純粋なオブジェクト → i18next.init({ resources: { ja: { translation:
    ja } } }) でそのまま流用
  - 37ファイルの useI18n() → useTranslation()
- src/web/VIndex.vue / src/web/index.ts を React 化
- package.json から vue, vue-i18n, @vueuse/core, @vitejs/plugin-vue, vue-tsc を削除
- vue-tsc → tsc --noEmit -p tsconfig.renderer.json
- 残存 TypeScript エラーの一括対応
- 全 .vue ファイル削除

Vue → React 変換マッピング表

┌────────────────────────────────┬──────────────────────────────────────────┬───────────────────────────────┐
│ Vue 3 │ React │ 備考 │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ ref(x) │ useState(x) │ .value は直接参照に │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ ref<HTMLElement>() (template │ useRef<HTMLElement>(null) │ │
│ ref) │ │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ computed(() => expr) │ useMemo(() => expr, [deps]) │ deps 明示必須 │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ watch(src, cb) │ useEffect(() => cb(), [src]) │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ watch(src, cb, │ useEffect (デフォルトで mount 時実行) │ 同等 │
│ {immediate:true}) │ │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ watch(src, cb, {deep:true}) │ useEffect + 深比較 or シリアライズ │ 個別設計判断 │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ readonly(ref(x)) │ state (setter 非公開) │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ reactive({}) │ useState({}) or useReducer │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ onMounted(() => ...) │ useEffect(() => {...}, []) │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ onUnmounted(() => ...) │ useEffect(() => () => {...}, []) │ cleanup 関数 │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ defineProps<T>() │ (props: T) │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ defineEmits<E>() │ onXxx コールバック props │ update:value → onValueChange │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ v-model:value="x" │ value={x} onChange={setX} │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ v-if │ {cond && <Comp />} │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ v-for │ {list.map(item => <Comp key={item.id} │ key 必須 │
│ │ />)} │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ v-show │ style={{display: cond ? undefined :      │                               │
 │                                │ 'none'}} │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ <slot> │ children or 名前付き render prop │ 7件のみ、個別対応 │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ :class="{active: isActive}" │ Panda cx() / 条件付き css() │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ :style="{...}" │ style={{...}} │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ provide/inject │ Context.Provider / useContext │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ @click │ onClick │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ @pointerdown.left │ onPointerDown={e => e.button === 0 && │ 修飾子は手動 │
│ │ fn(e)} │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ useI18n().t(key) │ useTranslation().t(key) │ │
├────────────────────────────────┼──────────────────────────────────────────┼───────────────────────────────┤
│ カスタム要素 <e-xxx> │ そのまま利用可 │ Vite の isCustomElement │
│ │ │ 設定維持 │
└────────────────────────────────┴──────────────────────────────────────────┴───────────────────────────────┘

ディレクトリ構造 Before / After

Before:
src/renderer/
components/ # 61個の .vue
stores/ # create*/use* (Vue InjectionKey)
libs/ # ipc.ts, keyboards.ts (ほぼ Vue 非依存)
styles/ # SCSS + styles.ts
utils/ # vue.ts + 汎用
windows/ # @base.ts (Vue createApp), 各 .ts エントリ

After:
src/renderer/
components/ # 61個の .tsx（V プレフィックス外す）
stores/ # create*/use* (React Context)
contexts/ # StoreContext.tsx (Provider 合成)
hooks/ # useTileLayout, useResizeObserver 等の抽出 hook
libs/ # 無変更
styles/ # panda.config.ts + globalCss（SCSS 全削除）
utils/ # vue.ts 削除、残りは無変更
windows/ # @base.tsx (React createRoot), 各 .tsx エントリ

重要ファイルと流用資産

無変更で流用:

- src/main/ 全体（96ファイル）
- src/commons/ 全体（61ファイル: IPC 型定義、データ型、言語ファイル）
- src/renderer/libs/ipc.ts — Proxy ベースの IPC クライアント、Vue 非依存
- src/renderer/libs/keyboards.ts — クラスベース、Vue 非依存
- src/renderer/utils/ の vue.ts 以外（hitTest.ts, history.ts, fileURL.ts, filters/, pFileObject/）
- vitePlugins/electronWindows.ts — フレームワーク非依存の仮想 HTML プラグイン

全面書き換え対象:

- src/renderer/windows/@base.ts (113行) — ブートストラップ層
- src/renderer/stores/keyStoreCreatorPair.ts — DI 型アダプタ
- 20個の create*.ts / use*.ts
- 61個の .vue ファイル → .tsx
- src/renderer/styles/\*.scss (6ファイル) → Panda CSS config

リスクと対応策

リスク: 双方向 IPC 同期ストア（settingsStore, statesStore）の watch(deep:true) + unwatch/rewatch パターン
影響: 無限ループ等の微妙なバグ
対応: useRef フラグで IPC 起因 vs UI 起因の更新を区別。ラウンドトリップの統合テスト追加
────────────────────────────────────────
リスク: VBrowser.vue (763行) を 1:1 変換
影響: 保守性が低下
対応: Phase 3 で記載の通り、4つのサブコンポーネント + 3つの custom hook に分解
────────────────────────────────────────
リスク: pixi.js の React 組込み
影響: キャンバスのライフサイクル不整合
対応: useRef でキャンバス要素、useEffect で pixi.js Application のライフサイクル管理。imperative な処理は hook
内に隔離
────────────────────────────────────────
リスク: main ブランチとの乖離
影響: マージコンフリクト
対応: 週次で rebase。コンフリクトは src/renderer/ でしか発生せず、React 側を優先し新規 Vue ロジックを手動ポート
────────────────────────────────────────
リスク: vue-tsc → tsc 移行時の一時的な型エラー噴出
影響: 作業停滞
対応: Phase 0 で先に非 Vue ファイルの tsc --noEmit をベースライン化。.vue 削除で Vue 固有エラーは消える
────────────────────────────────────────
リスク: カスタム要素 <e-xxx> が React に未知の props 警告を出す
影響: ビルド警告
対応: Vite の isCustomElement 設定を維持。小文字タグ名なので React 18/19 ともに対応可能
────────────────────────────────────────
リスク: ストアの onUnmounted cleanup 漏れ
影響: メモリリーク
対応: 各ストアで useEffect return の cleanup を徹底。react-hooks/exhaustive-deps ESLint ルール強制

検証計画

ビルド検証

- npm run build:app（vite build）が通る
- npm run build:app-web が通る
- tsc --noEmit が通る（vue-tsc 置換後）
- npm run build:electron で配布パッケージ生成
- npm run test — 既存 vitest が全てグリーン（テストは test/ にあり main プロセスのロジックをテストしている）

ウィンドウ起動検証（13ウィンドウ）

browser, board, settings, libraries, details, eula, capture, quit, modal, task, web, pageDownloader, password
各々について:

- トレイメニュー / IPC から起動
- タイトルバーが正しくレンダ
- コンテキストメニュー動作
- close/minimize/maximize 動作

機能検証

- 画像インポート: ドラッグ&ドロップ、タイルグリッドに表示
- タグ管理: 作成・付与・削除・フィルタ
- ボード: 画像配置、pan/zoom、保存
- 設定: 全タブ表示、再起動後も保持
- 詳細: ダブルクリックで詳細表示
- 検索/ソート: 日付・色類似度・タグ検索
- キーボードショートカット: Ctrl+D (devtools), Ctrl+A (select all)
- NSFW トグル
- i18n: 日本語全表示
- テーマ: ダーク/ライト適用（IPC 経由の style 同期）
- リサイザ: ブラウザウィンドウ左右ペインのドラッグ
- Web 版: npm run dev:app-web が正しく動作

実装時に最初に読むべきファイル

1.  /Users/gam0229/Develop/takumus/ImagePetaPeta/src/renderer/windows/@base.ts — ブートストラップ層、最重要
2.  /Users/gam0229/Develop/takumus/ImagePetaPeta/src/renderer/stores/keyStoreCreatorPair.ts — DI
    型アダプタ、全ストアの入口
3.  /Users/gam0229/Develop/takumus/ImagePetaPeta/vite.app.config.ts — Vite 設定、Vue plugin 差し替え箇所
4.  /Users/gam0229/Develop/takumus/ImagePetaPeta/src/renderer/stores/settingsStore/createSettingsStore.ts —
    最難関の双方向同期パターンの代表例
5.  /Users/gam0229/Develop/takumus/ImagePetaPeta/src/renderer/components/browser/VBrowser.vue —
    最大コンポーネント、分解のアーキタイプ
