# Gido Touch Mini

**Gido Touch Mini** は、Electron、React、TypeScript で構築されたインタラクティブなフロアガイド表示システムです。
小型タッチパネルディスプレイでの運用を想定しており、直感的なフロアマップ操作、店舗検索機能を提供します。

## 概要

商業施設向けのデジタルフロアガイドとして、以下の機能を提供します。

*   **フロアマップ表示**: 1F〜4F（設定により変更可能）のフロアマップを表示し、現在地や店舗位置をピンで示します。
*   **店舗リスト**: 各フロアの店舗一覧を表示し、タップすると詳細情報をモーダル表示します。
*   **多言語対応**: 日本語と英語の切り替えに対応しています。
*   **管理・設定**:
    *   統合設定画面でのフロアマップ画像設定、店舗ピン位置調整。
    *   プレビュー画面でのズーム・パン操作による直感的な座標設定。
    *   現在地アイコンのデザイン・アニメーション設定（波紋、バウンスなど）。
*   **自動更新**: アプリケーション起動時に更新を確認し、自動アップデートを行います。
*   **外部システム連携**:
    *   **BridgeGround**: 店舗情報の管理システムと連携し、SSE (Server-Sent Events) 接続によりリアルタイムに店舗データ・営業状況を反映します。

## 技術スタック

*   **Runtime**: [Electron](https://www.electronjs.org/) (v39.2.2)
*   **Frontend**: [React](https://react.dev/) (v19.2.0), [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4), CSS Modules
*   **State/Logic**: Custom Hooks, Context API
*   **Animation**: [Framer Motion](https://www.framer.com/motion/)
*   **Map Interaction**: [react-zoom-pan-pinch](https://github.com/prc5/react-zoom-pan-pinch)
*   **Packaging**: [electron-builder](https://www.electron.build/)

## セットアップと実行

### 前提条件

*   Node.js (v18以上推奨)
*   npm

### インストール

プロジェクトのルートディレクトリで依存関係をインストールします。

```bash
npm install
```

### 開発環境の起動

Vite 開発サーバーと Electron を同時に起動します。ホットリロードが有効です。

```bash
npm run electron:dev
```
※ ブラウザのみでUIを確認したい場合は `npm run dev` を使用できますが、Electron 固有の API (IPC 通信など) は動作しません。

### 本番ビルド (インストーラー作成)

Windows 用のインストーラー (`.exe`) を生成します。

```bash
npm run electron:build
```
生成物は `release/` ディレクトリに出力されます。

## 機能詳細

### 1. メイン画面 (Main Window)
アプリケーションのメインインターフェースです。
*   **マップエリア**: SVG形式のフロアマップを表示。ピンチ操作やドラッグ操作には対応していませんが、設定によりズーム挙動を制御可能です。
*   **店舗ピン**: マップ上に店舗の位置を示すピンを表示します。選択すると詳細が開きます。
*   **店舗リスト**: 画面下部に配置され、フロアごとの店舗一覧を表示します。
*   **右下エリア**: 営業時間案内画像などを表示します。

### 2. 統合設定画面 (Unified Settings)
アプリケーションの動作をカスタマイズするための管理者用画面です。
メイン画面上にモーダルとしてオーバーレイ表示されます（パスワード保護等は現在未実装）。

*   **プレビュー機能**: 設定画面中央には実際のマップが表示され、マウス操作でズーム・パンが可能です。これにより細かい位置調整が容易になります。
*   **画像設定タブ**: 各階のフロアマップ画像や、営業時間案内画像をローカルファイルから読み込んで設定できます。
*   **座標設定タブ**:
    *   店舗リストから対象を選択し、マップ上をタップ/ドラッグすることでピン位置を設定できます。
    *   現在地アイコンや吹き出しの位置も同様に調整可能です。
*   **現在地アイコン設定**:
    *   アイコンの種類、サイズ、アニメーション（Floating, Pulse, Bounce, Blink/Ripple）を設定できます。
    *   マップのズーム倍率に関わらず、アイコンサイズを一定に保つ設定も可能です。

### 3. バージョン情報 (Version Info)
*   現在のバージョンと最新バージョンを確認できます。
*   最新バージョンがある場合はリリースノートを表示します。
*   ウィンドウはドラッグして移動可能です。

### 4. 多言語切り替え
*   画面上の言語切替ボタンから日本語/英語を選択できます。
*   選択状態は `localStorage` に保存され、次回起動時も維持されます。

## ディレクトリ構成

```
Gido-Touch-Mini/
├── build/                  # Electron ビルド用リソース (アイコン, インストーラー設定)
├── electron/               # Electron メインプロセス関連
│   ├── main.cjs            # エントリーポイント
│   ├── preload.cjs         # プリロードスクリプト (IPC ブリッジ)
│   ├── updateChecker.cjs   # 自動更新ロジック
│   └── ...
├── media/                  # デフォルトのメディアファイル
├── src/                    # React フロントエンドソース
│   ├── api/                # 外部APIクライアント (BridgeClient)
│   ├── assets/             # 静的アセット (画像, SVG, フォント)
│   ├── components/         # UI コンポーネント (ShopPin, LocationIconsOverlay等)
│   ├── config/             # アプリケーション設定定数
│   ├── hooks/              # カスタムフック
│   ├── logs/               # ロギングユーティリティ
│   ├── repositories/       # データリポジトリ
│   ├── screens/            # 各画面コンポーネント (GidoApp, UnifiedSettingsScreen等)
│   ├── services/           # バックグラウンドサービス (SSEService)
│   ├── types/              # TypeScript 型定義
│   └── ...
└── release/                # ビルド生成物の出力先
```

## 外部システム連携仕様

### BridgeGround (店舗情報管理)
店舗情報の取得・更新には **BridgeGround** システムと連携します。
従来のREST APIによるポーリング方式ではなく、Server-Sent Events (SSE) を用いた常時接続により、情報の即時反映を実現しています。

*   **接続先**:
    *   **データ取得**: `http://localhost:[PORT]/api/shops`
    *   **イベント通知 (SSE)**: `http://localhost:[PORT]/api/events`
*   **クライアント実装**: `src/api/bridgeClient.ts` および `src/services/SSEService.ts`
*   **ポート仕様**: デフォルトで `8090` 番ポートを使用します。
*   **更新フロー**:
    1.  アプリケーション起動時に、REST API経由で全店舗データを取得します。
    2.  同時にSSEエンドポイントへ接続し、常時待機します。
    3.  BridgeGround側でデータ更新が発生すると、`update` イベントが送信されます。
    4.  アプリケーションはイベントを受信次第、データを再取得し画面を更新します。

## 通信仕様

### BridgeGround (店舗情報)
*   **接続方式**: Server-Sent Events (SSE)
*   **再接続**:
    *   ネットワーク切断やサーバー再起動等によりSSE接続が切れた場合、`src/services/SSEService.ts` により自動的（デフォルト5秒間隔）に再接続を試みます。
    *   これにより、BridgeGroundアプリケーションの再起動時なども自動的に復帰します。

## 設定ファイル

ユーザー設定は OS のアプリケーションデータフォルダに `settings.json` として保存されます。
(例: `C:\Users\[User]\AppData\Roaming\Gido Touch Mini\settings.json`)

主な設定項目:
*   `floor`: 現在表示中のフロア (デフォルト起動フロア)
*   `locationIcons`: 現在地アイコンや吹き出しのデザイン・アニメーション設定
*   `imageSettings`: カスタムフロアマップ画像のパス
*   `shopPositions`: 店舗ごとのマップ上での座標データ

## トラブルシューティング

*   **店舗データが表示されない**: BridgeGround が起動しているか、ポート `8090` がブロックされていないか確認してください。
*   **設定画面が開かない**: キーボードショートカットや特定の操作が必要な場合があります（仕様確認要）。
*   **設定が保存されない**: アプリケーションにファイル書き込み権限があるか確認してください。

## ライセンス

© 2025 Toei Techno International Inc.
