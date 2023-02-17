# Ayaka

## 概要

Dockerコンテナを用いた完全独立型個人開発環境構築サービスである．  
`/ayaka`と特定のチャンネルに投稿すると，送信者の`userid`に対応したディレクトリを作成・バインドし，予め準備されているイメージよりコンテナを作成する．

## 導入🧰

### 1. Ayaka・データベース資格情報ファイルを作成する

下記をコピーして `/app/.env` として作成する．
```bash
# ========================================
# bot資格情報
# ========================================

# botの名前
BOTNAME="ayaka"
# バージョン定義
VER=""
# アイコン画像URL
ICON="https://i.imgur.com/Wu4xmU5.png"
# 最上位ドメインを指定 ex) cybroad.dev 
# ※開発時適当でOK
TOPDOMAIN="cybroad.dev"
# エディタにアクセスする際のURL ex) http://ayaka.cybroad.dev
# ※開発時適当でOK
SERVICEDOMAIN=""
# リバースプロキシ連携時に使用するAPIエンドポイントを指定 ex) http://localhost:9020
# ※別途レポジトリから落としてきてください
APIPOINT="http://localhost:9020/api/v1"
# Ayakaが設置されているサーバのIPアドレスを指定
# ※開発時には空欄でOK
SERVERIP=""
# コンテナ一覧を立ち上げリッスンするポートを指定
PORTALURL=""
# ユーザデータの保管先を指定
MNTPOINT=""
# コンテナ内のユーザIDを指定(通常は1000)
PUID="1000"
# コンテナ内のグループIDを指定(通常は1000)
PGID="1000"
# Discordのトークンを指定
TOKEN=""
# あなたのDiscord botのクライアントIDを指定
CLIENTID=""
# あなたのDiscord botのギルドIDを指定
GUILDID=""

# ========================================
# データベース資格情報
# ========================================

DB_HOST="localhost"
DB_NAME="ayaka"
DB_USER="ayaka"
DB_PASS="<任意のユーザパスワード>"
DB_ROOT_PASS="<任意のrootパスワード>"


```

### 4. Dockerコンテナ🐋を起動する
`--env-file` オプションで環境変数を読み込む．  
※`docker compose` (v2) は `docker-compose` (v1)の新しいバージョンのものです．  
　公式はこちらへの移行を推奨しています．
```
$ docker compose --env-file ./app/.env up
```
お疲れ様です🎉 これで開発・公開ステップに入れます！
<br />
<br />

Tips💡 本番環境では，永続化オプションを付けると良いでしょう．
```
$ docker compose --env-file ./app/.env up -d
```
<br />

## よくある質問🤔

### Q.停止させたい！
A. `docker compose` を使いましょう．
```bash
$ docker compose --env-file ./app/.env down
```

### Q.思った動作にならない！，ようわからんエラーが出る！
まずエラー文を読み，検索にかけてみましょう．  
それでも解決しない場合は，迷える子羊のために用意した下の魔法のおまじないを試してみよう．
```bash
$ cd app
$ sh ./finish_process.sh
```
<br />