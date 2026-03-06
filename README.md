# Gido Touch Mini (Tauri版)

## 1. 概要

Gido Touch Mini は、小型タッチパネルディスプレイでの運用を想定したインタラクティブなフロアガイドです。
サイネージ機能を持たず、多言語対応と直感的な操作に特化しています。

* **ターゲットOS**: Windows (x64)

## 2. システム構成・技術スタック

* **Backend**: Rust, Tauri 2.x
* **Frontend**: React 19.2.0, TypeScript, Vite, Tailwind CSS (v4)
* **Map Interaction**: `react-zoom-pan-pinch`
* **Animation**: Framer Motion

## 3. 機能要件

* **フロアマップ・店舗検索**: SVGマップ表示、店舗ピン表示、タップによる詳細情報のモーダル表示。
* **多言語対応**: 日本語と英語の切り替え（選択状態は `localStorage` に保存）。
* **統合設定画面 (Unified Settings)**:
* マップのズーム・パンによる直感的なプレビュー・座標設定。
* 現在地アイコンのデザイン・アニメーション（Floating, Pulse, Bounce, Blink/Ripple等）の設定。
* ズーム倍率に依存せずアイコンサイズを一定に保つ設定。


* **バージョン情報画面**: 現在バージョンと最新バージョンの確認、簡易的なリリースノートの表示（ドラッグ移動可能）。

## 4. 画面仕様

* **メイン画面**: マップエリア、店舗ピン、画面下部の店舗リスト、右下エリア（営業時間案内等）。
* **設定画面**: メイン画面上にモーダルとしてオーバーレイ表示され、中央プレビューと画像・座標・アイコン設定タブを持つ。

## 5. データ構造と設定

設定ファイルは `%LOCALAPPDATA%\com.tti.gido_touch_mini\settings.json` （想定パス）に保存されます。
起動フロア(`floor`)、アイコンアニメーション(`locationIcons`)、カスタム画像(`imageSettings`)、店舗座標(`shopPositions`)を管理します。
ファイルの読み書きは `@tauri-apps/plugin-fs` 等を利用します。

## 6. 外部システム連携・通信仕様

* **BridgeGround (店舗情報管理)**:
* ポート: デフォルト `8090` 番。
* API/SSE: `/api/shops`, `/api/events`。
* 動作: 起動時にREST APIで全データ取得しつつSSEで常時待機し、`update` イベント受信でデータを再取得。
* 再接続: 切断時は `SSEService.ts` により5秒間隔で自動再接続を試み、サーバー再起動等に自動復帰。
* （注意: CMS配信等のサイネージ連携機能は含まれません）



## 7. ロギング・エラーハンドリング

Rustコマンド（`write_log`）を経由したファイル出力を実装。
ログファイルはローカルアプリデータフォルダに日別で生成されます。

## 8. 自動アップデート機能

Tauriの `@tauri-apps/plugin-updater` プラグインを使用し、起動時に自動アップデートを確認・実行します。

## 9. 開発・ビルド・運用

* **開発起動**: `npm run tauri:dev`
* **ビルド**: `npm run tauri:build`
* **セキュリティ制限**: TauriのCapabilitiesに基づき、不要なシステム権限を排除し、必要なAPIとファイルスコープのみを許可する堅牢な設計となっています。
