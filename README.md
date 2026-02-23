# セキュリティ／プライバシー・リテラシー（仮）

## 概要

新人が最低限回避すべき事故（秘密情報/権限/データ分類/誤公開等）と、チェックリスト運用を扱う。

## オンライン版（公開URL）

- GitHub Pages: `https://itdojp.github.io/security-privacy-literacy-book/`（想定）
- 入口: `docs/index.md`

## 開発（ローカル）

### 前提

- Node.js（`npm`）
- Ruby（Bundler 経由で Jekyll を実行）

### 手順

```bash
npm install

# （初回のみ）Jekyll 実行環境
# 例: Ruby/Bundler を導入後、bundle install

# プレビュー
npm start

# ビルド
npm run build

# テスト（markdown lint / link check）
npm test
```

## ライセンス

本書は **CC BY-NC-SA 4.0** で提供します。詳細は `LICENSE.md` を参照してください。
