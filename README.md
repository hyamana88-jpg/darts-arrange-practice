# Darts Checkout Trainer PWA

前回の `darts_trainer_v7.html` をベースに、GitHub Pages / iPhone のホーム画面追加を想定したPWA構成に分割したスターターです。

## ファイル
- `index.html` UI
- `styles.css` スタイル
- `app.js` 判定・練習ロジック
- `data/darts_checkout_2_180_do_mo.json` 2〜180のDO/MOデータ
- `manifest.webmanifest` PWA設定
- `service-worker.js` オフラインキャッシュ
- `.github/workflows/pages.yml` GitHub Pagesデプロイ
- `CODEX_PROMPT.md` Codexへの開発指示

## GitHub Pages
1. このフォルダ一式をGitHubリポジトリのルートへ置く。
2. GitHubの Settings → Pages → Source を **GitHub Actions** にする。
3. Actionsの `Deploy GitHub Pages` が成功したら公開URLをiPhoneのSafariで開く。
4. Safariの共有ボタン → **ホーム画面に追加**。

## 注意
元データは学習資料作成時のJSONです。アプリ側では明らかに不正なトークンを除外しますが、競技上の「推奨ルート」そのものの妥当性は、今後Codex側でテストとレビューを追加して検証してください。
