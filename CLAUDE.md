# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Gido-Touch-Mini は、商業施設の**小型タッチディスプレイ**用フロアガイドアプリ。Gido-Touchから機能を削った軽量派生で、Tauri2 + React19 + TypeScriptのWindows x64キオスクアプリ。**サイネージ映像枠を持たず**、地図・店舗検索のみのシンプルな構成（WonderScreen CMSとの連携はない）。

同一STB上のBridge-Ground（`C:\dev\Bridge-Ground`、:8090）から店舗データを取得する。「Mini」は画面サイズではなく機能スコープの縮小（サイネージ無し）を指しており、解像度自体はGido/Gido-Touchと同じ1920x1080 FHD想定（レイアウト密度のみ縮小チューニングされている）。

現バージョン: 1.1.25（`package.json`）。`docs/migration-guide-electron-to-tauri.md`にElectron→Tauri移行の詳細手順書がある（Gido/Grain-Linkと共通の移行だったと推測される）。

## Repository layout

- `src/api/` — Bridge-Ground向けAPIクライアント（`bridgeClient.ts`）
- `src/screens/` — 画面（地図＋店舗一覧、設定モーダル等）
- `src/components/` — UIコンポーネント
- `src/hooks/` — カスタムフック（`useTouchSound`等、Gido-Touchと共通のタッチ対応）
- `src/repositories/` — データ取得層
- `src/services/` — サービス層
- `src/config/` — 設定（Bridge-GroundベースURL解決、FHDレイアウト密度定数等）
- `src/types/` — 型定義
- `docs/migration-guide-electron-to-tauri.md` — Electron→Tauri2移行手順（43KB、Rust/Vite/IPC/CSP等を網羅）
- `MEDIA_DIRECTORY_README.md` — メディア配置ルール

## Development commands

Docker不使用。Node + Rust + Tauri CLIのローカル環境で直接実行する。

```bash
npm run dev            # Viteのみ
npm run tauri:dev      # Tauri込みの開発実行（通常はこちら）
npm run build          # tsc -b && vite build
npm run lint
```

リリースビルド:
```bash
npm run tauri:build:signed
npm run tauri:release
npm run bump:version
npm run media:optimize / npm run media:compress
```

## Known gotchas

- **サイネージ機能が無いため、CMS_API.mdやWonderScreen連携は存在しない**（Gido/Gido-Touchと違う点）。もし将来追加する場合は、Gido/Gido-Touchの`useCurrentAsset`パターンを参照すると良い。
- **Bridge-Ground前提はGido系と同じ**（同一コンピュータ、既定`localhost:8090`）。
- **「Mini」は画面サイズの意味ではない**。レイアウト定数（`listHeightVh`、`approxRowsPerCol`等）は解像度そのものではなく表示密度の調整用。誤って「小さい画面向けのブレークポイント」と決め打ちしないこと。

## Branches & deploy flow

- 作業は `dev` を起点に `hotfix/<内容>` または `feature/<内容>` ブランチを作成して行う（git worktreeで作業ディレクトリを分けるのが基本、`C:\dev\floor-guide-Issue\#000.md`参照）
- 作業完了後はそのブランチをpushしてPRを作成し、`dev`へのマージが完了した時点で対応するIssueをクローズする
- 過去は`dev`に直接作業・pushする運用だったが、複数リポジトリ・複数タスクの並行作業に対応するため上記のブランチ運用に移行した
- **デフォルトブランチは`main`ではなく`release`**（2026-07-10にリネーム。過去にデフォルトブランチが古い実験用ブランチ`claude/improve-floor-animation-5sRk2`にずれていたことが判明し、`release`へ明示的に再設定した）。`release`への**push**がGitHub Actions（`.github/workflows/build-release.yml`）の本番リリーストリガーになっている。
- **本番リリース手順**:
  1. `dev`で`npm run bump:version`を実行し、`package.json`のバージョンを先に上げる（**これを忘れると次のステップでワークフローが失敗する**、4.のガード参照）
  2. `dev` → `release` へPRを作成・マージ（`gh pr create --base release --head dev` → `gh pr merge`）
  3. `release`へのpushをトリガーに、GitHub Actionsが署名付きビルド（`npm run tauri:release`）→ S3アップロード（`dl.tti.ninja/public/gido-touch-mini/releases/`、`.exe`/`.exe.sig`/`latest.json`）→ タグ`vX.Y.Z`作成 → GitHub Release作成、まで自動実行する
  4. ワークフロー冒頭の「Check version not already released」ステップが、同名タグ（`vX.Y.Z`）が既に存在する場合はジョブを失敗させる（1.のバージョン上げ忘れによる既存リリース・S3成果物の無言上書きを防ぐガード）
- **2026-07-10以前はタグ（`v*`）のpushがリリーストリガーだった**（デフォルトブランチは当時`main`）。「デフォルトブランチへのpushでリリース」という一般的な形に統一するため変更した（Grain-Linkでの移行を横展開）。

## Architecture

```
Bridge-Ground（同一STB、:8090）──shops/event-news/shop-news + SSE（5秒毎リトライ）──► 地図＋店舗検索画面
```

- 外部連携はBridge-Groundのみ。Gido/Gido-Touchのようなサイネージ枠・WonderScreen CMS連携は無い、単機能構成。

## Code conventions

- ESLint（`npm run lint`）に従う。
- コミットメッセージは変更内容が明確に伝わるものにする。複数ファイルの変更を1コミットにまとめても構わない。

## Project context

Gido-Touch-Miniは「フロアガイド」製品群のうち、Gido-Touch（大型タッチ）から機能を絞った小型タッチ版。他の4リポジトリ（Gido/Gido-Touch/Grain-Link/Bridge-Ground/portal-cms）と合わせて`s-yoshida-33`配下でホストされている姉妹プロジェクト。ワークフロー運用ルールは`C:\dev\floor-guide-Issue\#000.md`を参照。
