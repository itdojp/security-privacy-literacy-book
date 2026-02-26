# セキュリティ＆プライバシー基礎リテラシー：秘密情報・権限・データ取り扱い

## 概要

新人が最低限回避すべき事故（秘密情報/権限/データ分類/誤公開等）と、チェックリスト運用を扱う。

## オンライン版（公開URL）

- GitHub Pages: `https://itdojp.github.io/security-privacy-literacy-book/`
- 入口: `docs/index.md`

## 開発（ローカル）

### 前提

- Node.js（`npm`）
- （推奨）Podman または Docker（Ruby が無い環境でも `npm start` / `npm run build` を実行可能）
- Ruby + Bundler（導入済みの場合はそれを利用）

### 手順

```bash
npm install

# Ruby/Bundler が無い場合は Podman/Docker を利用します（初回は image pull + bundle install が走ります）

# プレビュー
npm start

# ビルド
npm run build

# テスト（markdown lint / link check）
npm test
```

## ライセンス

本書は **CC BY-NC-SA 4.0** で提供します。詳細は `LICENSE.md` を参照してください。
