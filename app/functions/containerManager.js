import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { EmbedBuilder } from 'discord.js';
import { timerKillAyaka, delRecord } from './containerDelete.js';
import { errorMsg } from './functions/common.js';
import { execSync } from 'node:child_process';
import mysql from 'mysql2/promise';
const dbCfg = {
    host: globalCfg.DB_HOST,
    user: globalCfg.DB_USER,
    password: globalCfg.DB_PASS,
    database: globalCfg.DB_NAME,
}

// =====================================================================
// コンテナ削除時間延長関数(ボタン押下時)
// =====================================================================

export async function extendTime(ctnId, interaction) {
    let db = await mysql.createConnection(dbCfg); // データベースに接続
    try {
        let [res] = await db.execute(`SELECT container_name,created_at,expired_at,interval_id FROM users WHERE container_id = '${ctnId}'`);

        if (res.length == 0) throw new Error('あなたの作成したコンテナは一つも存在しないか見つかりませんでした。');

        clearInterval(res[0]["interval_id"]); // 既存のタイマーを解除
        let expiredMs = res[0]["expired_at"] + 10800000;// 3時間後(自動削除予定時刻)

        var intervalID = setInterval(() => {
            var dt = new Date(); // 現在時刻
            if (dt.getTime() >= expiredMs) { // 3時間後ミリ秒一致時

                interaction.channel.send(`<@${interaction.user.id}>`);
                const timerEmbed = new EmbedBuilder()
                    .setColor("#ED4245")
                    .setTitle(`${interaction.user.username}さんのコンテナは停止されました`)
                    .setDescription("3時間経過し、延長申請がなかったためコンテナを削除しました。")
                    .addFields(
                        { name: 'コンテナ名', value: res[0]["container_name"] },
                        { name: '作成日時', value: res[0]["created_at"].toLocaleString('ja-JP') },
                    )
                    .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
                interaction.channel.send({ embeds: [timerEmbed] });

                setTimeout(() => { // 3時間後にコンテナを削除
                    Promise.all([timerKillAyaka(ctnId), delRecord(ctnId)]).then((res) => {
                        console.log(res);
                        // コンテナID不一致 => 削除処理で何らかの例外発生
                        if (!(res[0] == ctnId)) throw new Error('削除対象のコンテナIDが一致しません。削除処理に失敗した可能性があります。');

                        const message = new EmbedBuilder()
                            .setColor(0X32CD32)
                            .setTitle('コンテナの削除に成功しました')
                            .setDescription("下記のコンテナを削除しました。")
                            .addFields(
                                { name: 'コンテナ名', value: res[0] },
                            )
                            .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
                        interaction.user.send({ ephemeral: true, embeds: [message] });
                    }).catch((e) => {
                        // 削除処理で何らかの例外発生
                        if (e.length == 3) errorMsg(interaction, e[0], e[1], e[2]);
                        else errorMsg(interaction, e);
                    });
                    clearInterval(intervalID);
                });
            }
        }, 1000);

        let [updateRes] = await db.execute(`UPDATE users SET interval_id = '${intervalID}' WHERE container_id = '${ctnId}'`);
        console.log(updateRes);
        return [expiredMs, ctnId];
    } catch (e) {
        console.log(e);
        throw e;
    }
}

// =====================================================================
// コンテナ削除関数(ボタン押下時)
// =====================================================================

export async function buttonKillAyaka(ctnId) {
    return new Promise((resolve, reject) => {
        try {
            var result = execSync(`docker kill $(docker ps -a -q -f name=${ctnId})`);
            console.log(result.toString().trim());
            if (result.toString().trim() == "") {
                reject("削除失敗"); // コンテナ削除失敗
            } else {
                resolve(ctnId); // コンテナ削除成功
            }
        } catch (e) {
            reject([e, 'M0002', 'コンテナの削除に失敗しました。詳細はエラーログをご確認ください。']); // 例外1
        }
    });
}

// =====================================================================
// ユーザーデータ削除関数(ボタン押下時)
// =====================================================================

export async function delUserDir(userId) {
    let db = await mysql.createConnection(dbCfg); // データベースに接続
    try {
        let [res] = await db.execute(`SELECT container_id FROM users WHERE user_id = ${userId}`);
        if (res.length == 0) throw ['NULL', 'M0004', 'あなたの作成したコンテナが一つ以上存在しているため，削除作業を継続出来ません。コンテナを削除してから再度お試しください。'];
        var result = execSync(`rm -rf /userData/${userId}`);
        console.log(result.toString().trim());

        if (result.toString().trim() == "") {
            return 0; // ユーザフォルダ削除成功
        } else {
            throw [result.toString().trim(), 'M0005', 'ユーザデータの削除に失敗しました。詳細はエラーログをご確認ください。']; // ユーザフォルダ削除失敗
        }
    } catch (e) {
        throw e;
    }
}