import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { EmbedBuilder } from 'discord.js';
import { timerKillAyaka, delRecord } from './containerDelete.js';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import mysql from 'mysql2/promise';
const dbCfg = {
    host: globalCfg.DB_HOST,
    user: globalCfg.DB_USER,
    password: globalCfg.DB_PASS,
    database: globalCfg.DB_NAME,
}

// =====================================================================
// ポート割り当て関数
// =====================================================================
export async function asighnPorts(userId) { // 利用可能ポートを割り当てる関数
    let db = await mysql.createConnection(dbCfg); // データベースに接続
    try {
        // データベースからユーザー数を取得
        let [resUsers] = await db.execute("SELECT COUNT(*) AS count FROM users");
        // すでにユーザーが作成したコンテナがあるか確認
        let [exsists] = await db.execute(`SELECT EXISTS(SELECT * FROM users WHERE user_id = ${userId}) as exsists_check`);
        console.log(resUsers[0].count);
        console.log(exsists[0].exsists_check);

        if (exsists[0].exsists_check == 1) { // すでにコンテナが作成されている場合(一人一コンテナ制限)
            return [1, "C0001"];
        } else { // コンテナが作成されていない場合
            if (resUsers[0].count == 0) {
                // ユーザーが一人もいない場合 => 初期60000ポートを割り当てる
                return [0, 60000];
            } else {
                // ユーザーがいる場合 => 利用可能ポートを割り当てる
                let [resPorts] = await db.execute("SELECT available_ports FROM users"); // データベースから利用可能ポートを取得
                console.log(resPorts);

                var port_list = []
                for (var i = 0; i < resPorts.length; i++) {
                    port_list.push(Number(resPorts[i].available_ports))
                }
                port_list.sort((a, b) => a - b);
                var diff_list = []
                for (var i = Number(port_list[0]); i <= Number(port_list.slice(-1)[0] + 1); i++) {
                    diff_list.push(i)
                }
                console.log(port_list, diff_list);
                var result = diff_list.filter(i => port_list.indexOf(i) == -1).slice(-1)[0];
                console.log(result);

                return [0, result];
            }
        }
    } catch (err) {
        console.log(err);
        return [1, "C0002", err]; // エラーが発生した場合はエラーコードとエラー内容を返す
    }
}

// =====================================================================
// フォルダ作成関数
// =====================================================================

export async function makeUserFolder(cfg) {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(`${globalCfg.MNTPOINT}/${cfg.userId}/config`)) {
                fs.mkdirSync(`${globalCfg.MNTPOINT}/${cfg.userId}/config`, { recursive: true }); // ユーザーフォルダを作成
                console.log("ユーザーフォルダを作成しました");
                resolve(0);
            } else {
                resolve(0);
            }
        } catch (e) {
            reject([e, 'C0003', 'ユーザーフォルダの作成に失敗しました。詳細はエラーログをご確認ください。']);
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
            var res = execSync(`docker run -d --name=${cfg.ctnId} --memory=1024mb -e PUID=${globalCfg.PUID} -e PGID=${globalCfg.PGID} -e TZ=Asia/Tokyo -e PASSWORD=${cfg.pass} -e SUDO_PASSWORD=${cfg.sudoPass} -e DEFAULT_WORKSPACE=/config/workspace -p ${cfg.port}:8443 -v ${globalCfg.MNTPOINT}/${cfg.userId}/config:/config --restart unless-stopped ayaka/allpkg`);

            if (res.toString().trim() == "") throw [res.toString().trim(), 'C0004', 'コンテナの起動に失敗しました。詳細はエラーログをご確認ください。'];

            console.log("コンテナを起動しました");
            var intervalID = setInterval(() => {
                var dt = new Date(); // 現在時刻
                if (dt.getTime() >= cfg.expiredMs) { // 3時間後ミリ秒一致時

                    interaction.channel.send(`<@${cfg.userId}>`);
                    const timerEmbed = new EmbedBuilder()
                        .setColor("#ED4245")
                        .setTitle(`${interaction.user.username}さんのコンテナは停止されました`)
                        .setDescription("3時間経過し、延長申請がなかったためコンテナを削除しました。")
                        .addFields(
                            { name: 'コンテナ名', value: cfg.containerName },
                            { name: '作成日時', value: cfg.createdTime.toLocaleString('ja-JP') },
                        )
                        .setTimestamp()
                    interaction.channel.send({ embeds: [timerEmbed] });

                    setTimeout(() => { // 3時間後にコンテナを削除
                        Promise.all([timerKillAyaka(cfg.ctnId), delRecord(cfg.ctnId)]).then((res) => {
                            console.log(res);
                            // コンテナID不一致 => 削除処理で何らかの例外発生
                            if (!(res[0] == cfg.ctnId)) throw new Error('削除対象のコンテナIDが一致しません。削除処理に失敗した可能性があります。');

                            const message = new EmbedBuilder()
                                .setColor(0X32CD32)
                                .setTitle('コンテナの削除に成功しました')
                                .setDescription("下記のコンテナを削除しました。")
                                .addFields(
                                    { name: 'コンテナ名', value: res[0] },
                                )
                                .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
                            interaction.user.send({ ephemeral: true, embeds: [message] });
                        }).catch(async (e) => {
                            // 削除処理で何らかの例外発生
                            if (e.length == 3) await errorMsg(interaction, e[0], e[1], e[2]);
                            else await errorMsg(interaction, e);
                        });
                        clearInterval(intervalID);
                    });
                }
            }, 1000);

            cfg.intervalID = intervalID; // タイマーIDを格納
            console.log("タイマーを起動しました");
            resolve(0);

        } catch (e) {
            // コンテナ起動時に何らかの例外発生
            reject(e);
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
                reject([res.toString(), "C0005", `${cfg.ctnId}の外部接続設定に失敗しました。詳細はエラーログをご確認ください。`]);
            }
        } catch (e) {
            reject([e, "C0005", `${cfg.ctnId}の外部接続設定に失敗しました。詳細はエラーログをご確認ください。`]);
        }
    });
};

// =====================================================================
// データベースにレコードを追加する関数
// =====================================================================

export async function addRecord(cfg) {
    let db = await mysql.createConnection(dbCfg); // データベースに接続
    try {
        var res = await db.execute(
            `INSERT INTO users VALUES ("${cfg.userId}","${cfg.ctnId}","${cfg.containerName}","${cfg.pass}","${cfg.sudoPass}",${cfg.port},${cfg.nowIimeMs},${cfg.expiredMs},${cfg.intervalID})`,
        );
        if (res[0].affectedRows == 0) throw [res[0].affectedRows, 'C0006', 'レコードの追加に失敗しました。詳細はエラーログをご確認ください。'];
        console.log("レコードを追加しました");
        return 0;
    } catch (e) {
        throw e;
    }
}