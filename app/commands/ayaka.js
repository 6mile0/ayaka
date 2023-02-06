import globalCfg from "../config.json" assert { type: "json" };
import dbCfg from "../dbCredentials.json" assert { type: "json" };
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { execSync } from 'node:child_process';
import { nanoid, customAlphabet } from 'nanoid';
import fs from 'node:fs';
import mysql from 'mysql2';
const coustomNanoid = customAlphabet('1234567890abcdef', 8);

async function addProxy(cfg) { // 利用可能ポートを割り当てる関数
    return new Promise((resolve, reject) => {
        try {
            var res = execSync(`docker exec ayaka-nginx-1 sh /etc/nginx/conf.d/add.sh ${cfg.ctnId} ${cfg.port}`); // ポートを追加
            if (res.toString().trim() == "Reloading nginx: nginx.") {
                resolve(`${cfg.ctnId}の外部接続設定(${cfg.port}番)を追加しました`);
            } else {
                console.log(res.toString());
                reject(`${cfg.ctnId}の外部接続設定に失敗しました`);
            }
        } catch {
            reject(`${cfg.ctnId}の外部接続設定に失敗しました`);
        }
    });
};

async function asighnPorts() { // 利用可能ポートを割り当てる関数
    return new Promise((resolve, reject) => {
        try {
            let db = mysql.createConnection(dbCfg); // データベースに接続
            db.execute(
                "SELECT * FROM users",
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    console.log(res);
                }
            );
            db.execute(
                "SELECT COUNT(*) AS count FROM users",
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    console.log(res[0].count);
                    resolve(60000 + res[0].count);
                }
            );
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

async function startUpAyaka(cfg, interaction) {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(`${globalCfg.mntPoint}/${cfg.userId}/config`)) {
                fs.mkdirSync(`${globalCfg.mntPoint}/${cfg.userId}/config`, { recursive: true }); // ユーザーフォルダを作成
                console.log("ユーザーフォルダを作成しました");
            }
        } catch (err) {
            reject(err);
        }

        try {
            var res = execSync(`docker run -d --name=${cfg.ctnId} -e PUID=${globalCfg.puId} -e PGID=${globalCfg.pgId} -e TZ=Asia/Tokyo -e PASSWORD=${cfg.pass} -e SUDO_PASSWORD=${cfg.sudoPass} -e DEFAULT_WORKSPACE=/config/workspace -p ${cfg.port}:8443 -v ${globalCfg.mntPoint}/${cfg.userId}/config:/config --restart unless-stopped ayaka/allpkg`);
            if (res.toString().trim() == "") {
                reject("コンテナの起動に失敗しました");
            } else {
                console.log("コンテナを起動しました");
            }

            try {
                var nowIimeMs = Math.round(new Date().getTime() / 1000); // 現在時刻(ミリ秒)
                var createdTime = new Date(nowIimeMs * 1000); // 生成時間
                var expiredTime = new Date((nowIimeMs + (3600 * 3)) * 1000); // 3時間後(自動削除予定時刻)

                var intervalID = setInterval(() => {
                    if (nowIimeMs >= (nowIimeMs + 10800000)) { // 3時間後ミリ秒一致時
                        const timerEmbed = new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle('コンテナを停止しました')
                            .setDescription("3時間経過し、延長申請がなかったためコンテナを停止しました。\nご利用ありがとうございました。")
                            .addFields(
                                { name: 'コンテナ名', value: cfg.containerName },
                                { name: '作成者', value: interaction.user.username },
                                { name: '作成日時', value: createdTime.toLocaleString('ja-JP') },
                            )
                            .setTimestamp()
                        interaction.channel.send({ embeds: [timerEmbed] });
                        setTimeout(() => {
                            clearInterval(intervalID);
                        });
                    }
                }, 1000);

                let db = mysql.createConnection(dbCfg); // データベースに接続
                db.execute(
                    `INSERT INTO users VALUES ("${cfg.userId}","${cfg.ctnId}","${cfg.containerName}","${cfg.pass}","${cfg.sudoPass}",${cfg.port},${nowIimeMs},${nowIimeMs + 10800000},${intervalID},0)`,
                    function (err, res) {
                        if (err) {
                            console.log(err);
                            reject(err);
                        }
                        resolve([
                            `${globalCfg.serviceDomain}/${cfg.ctnId}/login`, // アクセスURL
                            cfg.containerName, // コンテナ名
                            cfg.pass, // パスワード
                            cfg.sudoPass, // sudoパスワード
                            createdTime.toLocaleString('ja-JP'), // 生成時間
                            expiredTime.toLocaleString('ja-JP'), // 削除予定時刻
                            cfg.port, // ポート
                            "mira" // 収容サーバ
                        ]);
                    }
                );
                db.end();
            } catch (err) {
                console.log(err);
                reject(err);
            }
        } catch (err) {
            reject(err);
        }
    });
}

export default {
    data: new SlashCommandBuilder()
        .setName('ayaka')
        .setDescription('コンテナ型独立開発環境を立ち上げることができます。3hで自動停止しますが、延長をすることが可能です。'),
    async execute(interaction) {
        console.log(interaction.user);
        const ports = await asighnPorts(); // 利用可能ポートを取得
        const containerInfo = {
            "ctnId": nanoid(16), // コンテナID
            "userId": interaction.user.id, // ユーザーID
            "containerName": "ayaka-" + coustomNanoid(), // コンテナ名
            "pass": nanoid(20), // パスワード
            "sudoPass": nanoid(32), // sudoパスワード
            "port": ports, // 利用可能ポート
        };

        await addProxy(containerInfo); // プロキシを追加
        await startUpAyaka(containerInfo, interaction).then((res) => {
            console.log(res);
            const message = new EmbedBuilder()
                .setColor(0x32cd32)
                .setTitle('コンテナが準備できたよ！')
                .setDescription("開発環境の生成が完了しました。以下の情報を確認してください。")
                .addFields(
                    { name: 'アクセスURL', value: res[0] },
                    { name: 'コンテナ名', value: res[1] },
                    { name: 'エディタログインパスワード', value: "`" + res[2] + "`" },
                    { name: 'sudoパスワード', value: "`" + res[3] + "`" },
                    { name: '生成日時', value: res[4] },
                    { name: '自動削除予定日時', value: res[5] },
                    { name: '利用可能ポート', value: String(res[6]) },
                    { name: '収容サーバ', value: res[7] },
                )
                .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });

            const controlBtn = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('stop')
                        .setLabel("コンテナ停止(削除)")
                        .setStyle(ButtonStyle.Danger),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('extend')
                        .setLabel("利用期間を延長する(3h)")
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('export')
                        .setLabel("データをエクスポートする")
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                )
            interaction.reply({
                ephemeral: true, embeds: [message], components: [controlBtn]
            });
        }).catch((error) => {
            console.log(error);
            const message = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('エラーが発生しました')
                .setDescription("[E1001] コンテナの起動に失敗しました。")
                .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
            interaction.reply({ ephemeral: true, embeds: [message] });
        });
    },
};