# Ayaka

## 概要

Dockerコンテナを用いた完全独立型個人開発環境構築サービスである．  
`/ayaka`と特定のチャンネルに投稿すると，送信者の`userid`に対応したディレクトリを作成・バインドし，予め準備されているイメージよりコンテナを作成する．

## 導入

### 1. Ayaka側の設定ファイルを作成する

下記をコピーして `/app/config.json` として作成する．
```
{
    "token": "<あなたのDiscord botのトークン>",
    "clientId": "<あなたのDiscord botのクライアントID>",
    "guildId": "<あなたのDiscordサーバーのID>",
    "botName": "ayaka",
    "ver": "1.0.0",
    "serviceDomain": "https://<任意のドメイン>/",
    "mntPoint": "/home/ayaka/",
    "puId": "1000",
    "pgId": "1000"
}
```

### 2. データベースのrootパスワード，ユーザパスワードファイルを作成する
`sercrets/db_rootPass.txt` と `secrets/db_userPass.txt` を作成し，それぞれのファイルにパスワードを書き込む．

### 3. データベースの資格情報を作成する
下記をコピーして `/app/dbCredentials.json` として作成する．
```
{
    "host": "db",
    "user": "ayaka",
    "database": "ayaka",
    "password": "<secrets/db_userPass.txtのパスワード>"
}
```

### 4. Dockerコンテナを起動する
```
$ docker-compose up -d
```

お疲れ様です！これで開発・公開ステップに入れます！
