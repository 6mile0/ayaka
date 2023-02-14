# Ayaka

## 概要

Dockerコンテナを用いた完全独立型個人開発環境構築サービスである．  
`/ayaka`と特定のチャンネルに投稿すると，送信者の`userid`に対応したディレクトリを作成・バインドし，予め準備されているイメージよりコンテナを作成する．

## 導入🔧

### 1. Ayaka・データベース資格情報ファイルを作成する

下記をコピーして `/app/.env` として作成する．
```bash
# ========================================
# bot資格情報
# ========================================

BOTNAME=ayaka
VER=1.0.0
ICON="https://i.imgur.com/Wu4xmU5.png"
SERVICE_DOMAIN="https://<任意のドメイン>/"
MNTPOINT="<任意のコンテナ生成時ユーザデータ保管場所>"
PUID="1000"
PGID="1000"
TOKEN="<あなたのDiscord botのトークン>"
CLIENTID="<あなたのDiscord botのクライアントID>"
GUILDID="<あなたのDiscordサーバーのID>"

# ========================================
# データベース資格情報
# ========================================

DB_HOST="db"
DB_NAME="ayaka"
DB_USER="ayaka"
DB_PASS="<任意のユーザパスワード>"
DB_ROOT_PASS="<任意のrootパスワード>"

```

### 4. Dockerコンテナ🐋を起動する
`--env-file` オプションで環境変数を読み込む．
```
$ docker compose --env-file ./app/.env up
```

### お疲れ様です🎉 これで開発・公開ステップに入れます！
<br />
<br />

Tips💡 本番環境では，永続化オプションを付けると良いでしょう．
```
$ docker compose --env-file ./app/.env up -d
```