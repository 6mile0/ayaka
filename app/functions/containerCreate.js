import globalCfg from "../config.json" assert { type: "json" };
import dbCfg from "../dbCredentials.json" assert { type: "json" };
import { EmbedBuilder } from 'discord.js';
import { timerKillAyaka, delRecord } from './containerDelete.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import mysql from 'mysql2';

// =====================================================================
// ポート割り当て関数
// =====================================================================
export async function asighnPorts() { // 利用可能ポートを割り当てる関数
    return new Promise(async (resolve, reject) => {
        let db = mysql.createConnection(dbCfg); // データベースに接続
        try {
            db.execute(
                "SELECT COUNT(*) AS count FROM users",
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    console.log(res[0].count);
                    if(res[0].count == 0){
                        resolve(60000);
                    }else{
                        db.execute(
                            "SELECT available_ports FROM users",
                            function(err,res){
                                console.log(res);
                                if(err){
                                    console.log(err);
                                    reject(err);
                                }
                                var port_list = []
                                for(var i=0; i<res.length; i++){
                                    port_list.push(Number(res[i]["available_ports"]))
                                }
                                port_list.sort((a, b) => a - b);
                                var diff_list = []
                                for(var i=Number(port_list[0]); i<=Number(port_list.slice(-1)[0]+1); i++){
                                    diff_list.push(i)
                                }
                                console.log(port_list,diff_list);
                                var result = diff_list.filter(i => port_list.indexOf(i) == -1).slice(-1)[0];
                                console.log(result);
                                resolve(result);
                            }
                        )
                    }
                }
            );
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

// =====================================================================
// フォルダ作成関数
// =====================================================================

export async function makeUserFolder(cfg) {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(`${globalCfg.mntPoint}/${cfg.userId}/config`)) {
                fs.mkdirSync(`${globalCfg.mntPoint}/${cfg.userId}/config`, { recursive: true }); // ユーザーフォルダを作成
                console.log("ユーザーフォルダを作成しました");
                resolve(0);
            } else {
                resolve(0);
            }
        } catch (err) {
            reject(err);
        }
    });
}

// =====================================================================
// コンテナ起動関数
// =====================================================================

export async function startUpAyaka(cfg, interaction) {
    return new Promise((resolve, reject) => {
        cfg.nowIimeMs = new Date().getTime(); // 現在時刻(ミリ秒)
        cfg.expiredMs = cfg.nowIimeMs + 10800000;// 3時間後(自動削除予定時刻)
        cfg.createdTime = new Date(cfg.nowIimeMs); // 生成時間
        cfg.expiredTime = new Date(cfg.expiredMs); // 3時間後(自動削除予定時刻)
        console.log(cfg);

        try {
            var res = execSync(`docker run -d --name=${cfg.ctnId} -e PUID=${globalCfg.puId} -e PGID=${globalCfg.pgId} -e TZ=Asia/Tokyo -e PASSWORD=${cfg.pass} -e SUDO_PASSWORD=${cfg.sudoPass} -e DEFAULT_WORKSPACE=/config/workspace -p ${cfg.port}:8443 -v ${globalCfg.mntPoint}/${cfg.userId}/config:/config --restart unless-stopped ayaka/allpkg`);
            if (res.toString().trim() == "") {
                reject("コンテナの起動に失敗しました");
            } else {
                console.log("コンテナを起動しました");
                var intervalID = setInterval(() => {
                    var dt = new Date(); // 現在時刻
                    if (dt.getTime() >= cfg.expiredMs) { // 3時間後ミリ秒一致時
                        const timerEmbed = new EmbedBuilder()
                            .setColor("#ED4245")
                            .setTitle(`${interaction.user.username}さんのコンテナは停止されました`)
                            .setDescription("3時間経過し、延長申請がなかったためコンテナを削除しました。\nご利用ありがとうございました。")
                            .addFields(
                                { name: 'コンテナ名', value: cfg.containerName },
                                { name: '作成日時', value: cfg.createdTime.toLocaleString('ja-JP') },
                            )
                            .setTimestamp()
                        interaction.channel.send({ embeds: [timerEmbed] });

                        setTimeout(() => { // 3時間後にコンテナを削除
                            Promise.all([timerKillAyaka(cfg.ctnId), delRecord(cfg.ctnId)]).then((res) => {
                                console.log(res);
                                if (res[0] == cfg.ctnId) {
                                    const message = new EmbedBuilder()
                                        .setColor(0X32CD32)
                                        .setTitle('ご利用ありがとうございました')
                                        .setDescription("下記のコンテナを削除しました。")
                                        .addFields(
                                            { name: 'コンテナ名', value: res[0] },
                                        )
                                        .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                                    interaction.user.send({ ephemeral: true, embeds: [message] });
                                } else {
                                    const message = new EmbedBuilder()
                                        .setColor(0xFF0000)
                                        .setTitle('エラーが発生しました')
                                        .setDescription("[E1001] コンテナの削除に失敗しました。")
                                        .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                                    interaction.reply({ ephemeral: true, embeds: [message] });
                                }
                            }).catch((err) => {
                                console.log(err);
                                const message = new EmbedBuilder()
                                    .setColor(0xFF0000)
                                    .setTitle('エラーが発生しました')
                                    .setDescription("[E1001] コンテナの削除に失敗しました。")
                                    .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                                interaction.reply({ ephemeral: true, embeds: [message] });
                            });
                            clearInterval(intervalID);
                        });
                    }
                }, 1000);
                cfg.intervalID = intervalID; // タイマーIDを格納
                console.log("タイマーを起動しました");
                resolve(0);
            }
        } catch (err) {
            reject(err);
        }
    });
}

// =====================================================================
// プロキシ設定追加関数
// =====================================================================

export async function addProxy(cfg) { // 利用可能ポートを割り当てる関数
    return new Promise((resolve, reject) => {
        try {
            var res = execSync(`docker exec ayaka-nginx-1 sh /etc/nginx/conf.d/add.sh ${cfg.ctnId} ${cfg.port}`); // ポートを追加
            if (res.toString().trim() == "Reloading nginx: nginx.") {
                resolve(0);
            } else {
                console.log(res.toString());
                reject(`${cfg.ctnId}の外部接続設定に失敗しました`);
            }
        } catch {
            reject(`${cfg.ctnId}の外部接続設定に失敗しました`);
        }
    });
};

// =====================================================================
// データベースにレコードを追加する関数
// =====================================================================

export async function addRecord(cfg) {
    return new Promise(async (resolve, reject) => {
        let db = mysql.createConnection(dbCfg); // データベースに接続
        try {
            db.execute(
                `INSERT INTO users VALUES ("${cfg.userId}","${cfg.ctnId}","${cfg.containerName}","${cfg.pass}","${cfg.sudoPass}",${cfg.port},${cfg.nowIimeMs},${cfg.expiredMs},${cfg.intervalID})`,
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    } else {
                        console.log(res);
                        console.log("レコードを追加しました");
                        resolve(0);
                    }
                }
            );
        } catch (e) {
            console.log(e);
            reject(e);
        }
    });
}