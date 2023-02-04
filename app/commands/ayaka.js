import globalCfg from "../config.json" assert { type: "json" };
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { nanoid } from 'nanoid';
import fs from 'node:fs';
import { exec, execSync } from 'node:child_process';
import mariadb from 'mariadb';
const pool = mariadb.createPool({
    host: "db",
    user: "root",
    password: "kidahirokazu",
    database: "containers",
    port: "3306"
})
function padZero(time) {
    return time.toString().padStart(2, "0")
}

const asighnPorts = async () => {
    return new Promise((resolve, reject) => {
        pool.getConnection()
            .then(conn => {
                conn.query("SELECT COUNT(*) FROM container_infos")
                    .then((rows) => {
                        var PortNum = Number(rows[0]["COUNT(*)"]);
                        if (PortNum == 0) {
                            resolve(60000);
                        } else {
                            resolve(60000 + PortNum);
                        }
                        console.log(60000 + PortNum);
                        conn.end();
                    })
                    .catch(err => {
                        //handle error
                        console.log(err);
                        conn.end();
                    })

            }).catch(err => {
                //not connected
                console.log(err);
            });
    });
}

const startUpAyaka = async (cfg) => {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(`${globalCfg.mntPoint}/${cfg.userId}/config`)) {
                fs.mkdirSync(`${globalCfg.mntPoint}/${cfg.userId}/config`, { recursive: true }); // ユーザーフォルダを作成
            }
        } catch (err) {
            reject(err);
        }

        exec(`docker run -d --name=${cfg.ctnId} -e PUID=${globalCfg.puId} -e PGID=${globalCfg.pgId} -e TZ=Asia/Tokyo -e PASSWORD=${cfg.pass} -e SUDO_PASSWORD=${cfg.sudoPass} -e DEFAULT_WORKSPACE=/config/workspace -p ${cfg.port}:8443 -v ${globalCfg.mntPoint}/${cfg.userId}/config:/config --restart unless-stopped ayaka/devspace`, { timeout: 10000 },
            function (error, stdout, stderr) {
                // シェル上でコマンドを実行できなかった場合のエラー処理
                if (error !== null) {
                    if (!stderr) {
                        reject(error);
                    } else {
                        reject(stderr);
                    }
                }

                try {
                    var existCheck = execSync(`docker ps -a -f 'name=${cfg.ctnId}' --format "{{.Names}}"`);
                    if (existCheck.toString().trim() == "") { // コンテナIDが一致しなかった場合 => コンテナが起動していない
                        reject("コンテナが起動していません");
                    }
                } catch {
                    reject("コンテナが起動していません");
                };

                if (stdout.toString()) { // コンテナIDが一致した場合
                    pool.getConnection()
                        .then(conn => {
                            var date = new Date();
                            var date = date.getUTCFullYear() + '-' +
                                ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
                                ('00' + date.getUTCDate()).slice(-2) + ' ' +
                                ('00' + date.getUTCHours()).slice(-2) + ':' +
                                ('00' + date.getUTCMinutes()).slice(-2) + ':' +
                                ('00' + date.getUTCSeconds()).slice(-2);
                            conn.query(`insert into container_infos values(${cfg.ctnId},${cfg.userId},${cfg.containerName},${cfg.pass},${cfg.sudoPass},${cfg.port},${date},${new Date().getTime() + 10800000})`)
                                .then((rows) => {
                                    console.log("sucesss");
                                    resolve([
                                        `https://ayaka.cybroad.dev/attach/${cfg.ctnId}`,
                                        cfg.containerName,
                                        cfg.password,
                                        cfg.sudoPassword,
                                        `${padZero(cfg.startTime.getFullYear())}/${padZero(cfg.startTime.getMonth() + 1)}/${padZero(cfg.startTime.getDate())} ${padZero(cfg.startTime.getHours())}:${padZero(cfg.startTime.getMinutes())}:${padZero(cfg.startTime.getSeconds())}`, // 生成時間
                                        `${padZero(cfg.startTime.getFullYear())}/${padZero(cfg.startTime.getMonth() + 1)}/${padZero(cfg.startTime.getDate())} ${padZero(cfg.startTime.getHours() + 3)}:${padZero(cfg.startTime.getMinutes())}:${padZero(cfg.startTime.getSeconds())}`, // 3時間後
                                        cfg.port,
                                        "mira"
                                    ]);
                                    conn.end();
                                })
                                .catch(err => {
                                    //handle error
                                    console.log(err);
                                    reject(err);
                                    conn.end();
                                })

                        }).catch(err => {
                            console.log(err);
                            reject(err);
                        })
                }
            }
        )
    });
}

export default {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('コンテナ型独立開発環境を立ち上げることができます。3hで自動停止しますが、延長をすることが可能です。'),
    async execute(interaction) {
        console.log(interaction.user.id + " がコマンドを実行しました");
        const ports = await asighnPorts(interaction.user.id); // 利用可能ポートを取得
        const containerInfo = {
            "ctnId": nanoid(16), // コンテナID
            "userId": interaction.user.id, // ユーザーID
            "containerName": "ayaka-" + nanoid(16), // コンテナ名
            "pass": nanoid(20), // パスワード
            "sudoPass": nanoid(32), // sudoパスワード
            "port": ports, // 利用可能ポート
        };
        console.log(containerInfo);

        await startUpAyaka(containerInfo).then((res) => {
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
                .setFooter({ text: `ayaka Ver ${globalCfg.ver}`, iconURL: globalCfg.icon });

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
            interaction.reply({
                ephemeral: true, embeds: [message], components: [controlBtn]
            });
        }).catch((error) => {
            console.log(error);
            const message = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('エラーが発生しました')
                .setDescription("[E1001] コンテナの起動に失敗しました。")
                .setFooter({ text: `ayaka Ver ${globalCfg.ver}`, iconURL: globalCfg.icon });
            interaction.reply({ ephemeral: true, embeds: [message] });
        });
    },
};
