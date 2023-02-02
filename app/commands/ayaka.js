const { SlashCommandBuilder } = require('discord.js');
const { puId, pgId, mntPoint } = require('../config.json');
const nanoid = require("nanoid");
const fs = require('node:fs');
const exec = require('child_process');
var Datastore = require('nedb');
var db = new Datastore({
    filename: '../db/users.db',
    autoload: true
});

const asighnPorts = async (userid) => {
    return new Promise((resolve, reject) => {
        db.find({ userId: userid }, (err, docs) => {
            if (err) {
                reject(err);
            } else {
                if (docs.length == 0) {
                    resolve(60000);
                } else {
                    resolve(docs[0].port + 1);
                }
            }
        });
    });
}

const startUpAyaka = async (config) => {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(`${mntPoint}/${config.userid}/userFolder`)) {
                fs.mkdirSync(`${mntPoint}/${config.userid}/userFolder`); // ユーザーフォルダを作成
            }
        } catch (err) {
            reject(err);
        }

        exec(`docker run -d --name=${config.ctnId} -e PUID=${puId} -e PGID=${pgId} -e TZ=Asia/Tokyo -e PASSWORD=${config.pass} -e SUDO_PASSWORD=${config.sudoPass} -e DEFAULT_WORKSPACE=userFolder/workspace -p 8443:8443 -v ${mntPoint}/${config.userid}/userFolder:/userFolder --restart unless-stopped ami/all`, { timeout: 10000 },
            function (error, stdout, stderr) {
                // シェル上でコマンドを実行できなかった場合のエラー処理
                if (error !== null) {
                    if (!stderr) {
                        reject(error);
                    } else {
                        reject(stderr);
                    }
                }
                if (stdout.toString() == config.ctnId) { // コンテナIDが一致した場合
                    db.insert({
                        ctnId: config.ctnId, // コンテナID
                        userId: config.userId, // ユーザーID
                        containerName: config.containerName, // コンテナ名
                        password: config.pass, // パスワード
                        sudoPassword: config.sudoPass, // sudoパスワード
                        port: config.port, // 利用可能ポート
                        startTime: Date.now(), // 生成時間
                        endTime: Date.now() + 10800000, // 自動削除時間
                    }, (err, newDoc) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve([
                                `https://ayaka.cybroad.dev/attach/${config.ctnId}`,
                                config.containerName,
                                Date.now(),
                                config.port,
                                "mira"
                            ]);
                        }
                    });

                }
            });
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayaka')
        .setDescription('コンテナ型独立開発環境を立ち上げることができます。3hで自動停止しますが、延長をすることが可能です。'),
    async execute(interaction) {
        console.log(interaction.user.id + " がコマンドを実行しました");
        const user = client.users.cache.get(interaction.user.id); // ユーザー情報を取得

        const ports = await asighnPorts(interaction.user.id); // 利用可能ポートを取得
        const containerInfo = {
            "ctnId": nanoid(16), // コンテナID
            "userId": interaction.user.id, // ユーザーID
            "containerName": "ayaka-" + nanoid(16), // コンテナ名
            "pass": nanoid(20), // パスワード
            "sudoPass": nanoid(32), // sudoパスワード
            "port": ports, // 利用可能ポート
        };

        await startUpAyaka(containerInfo).then((res) => {
            console.log(res);
            const message = new EmbedBuilder()
                .setColor(0x32cd32)
                .setTitle('コンテナが準備できたよ！')
                .setDescription("開発環境の生成が完了しました。以下の情報を確認してください。")
                .addFields(
                    { name: 'アクセスURL', value: res[0] },
                    { name: 'コンテナ名', value: res[1] },
                    { name: '生成時間', value: res[2] },
                    { name: '利用可能ポート', value: res[3] },
                    { name: '収容サーバ', value: res[4] },
                )
                .setFooter({ text: `ayaka Ver ${ver}`, iconURL: 'https://i.imgur.com/Wu4xmU5.png' });

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
                        .setStyle(ButtonStyle.Success),
                )
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('export')
                        .setLabel("データをエクスポートする")
                        .setStyle(ButtonStyle.Primary),
                )
            user.send({
                ephemeral: true, embeds: [message], components: [controlBtn]
            });
        }).catch((error) => {
            console.log(error);
            const message = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('エラーが発生しました')
                .setDescription("[E1001] コンテナの起動に失敗しました。")
                .setFooter({ text: `ayaka Ver ${ver}`, iconURL: 'https://i.imgur.com/Wu4xmU5.png' });
            interaction.reply({ ephemeral: true, embeds: [message] });
        });
    },
};