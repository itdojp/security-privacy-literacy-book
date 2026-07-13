# セキュリティ＆プライバシー基礎リテラシー：秘密情報・権限・データ取り扱い

## 概要

新人が最低限回避すべき事故（秘密情報 / 権限 / データ分類 / 誤公開等）と、チェックリスト運用を扱う。

## オンライン版（公開 URL）

- GitHub Pages: `https://itdojp.github.io/security-privacy-literacy-book/`
- 入口: `docs/index.md`

## 開発（ローカル）

### 前提

- Node.js（`npm`）
- （推奨）Podman または Docker（Ruby が無い環境でも `npm start` / `npm run build` を実行可能）
- Ruby + Bundler（導入済みの場合はそれを利用）

### 手順

```bash
npm ci

# Ruby / Bundler が無い場合は Podman / Docker を利用します（初回は image pull + bundle install が走ります）

# プレビュー
npm start

# ビルド
npm run build

# テスト（metadata / security audit / reader UX / markdown lint / link check）
npm test
```

### 品質ゲート

`npm test` は、公開メタデータとナビゲーションの整合性、npm dependency audit、図表と索引の reader UX 契約を検証します。

```bash
npm run check:metadata
npm run check:security
npm run check:reader-ux
npm run check:reader-ux-regression
```

`check:metadata` は `book-config.json`、`package.json`、`package-lock.json`、
Jekyll 設定、トップページ front matter、`docs/_data/navigation.yml`、
設定済み公開ルート、必要なレイアウト・アセットを照合します。
`check:security` は `npm audit --omit=optional` を実行し、必須 dependency の既知脆弱性を CI で検出します。
`check:reader-ux` は、公開図表4件、stable anchor、文章代替、図表索引、reader navigation の一対一対応とSVGの安全性を検証します。
`check:reader-ux-regression` は、必須要素を壊したfixtureをcheckerが制御された失敗として拒否することを検証します。
章・付録・テンプレートの公開パスを追加または変更した場合は、
`book-config.json` と navigation を同じ PR で更新してください。

## ライセンス

本書は **CC BY-NC-SA 4.0** で提供します。詳細は `LICENSE.md` を参照してください。
