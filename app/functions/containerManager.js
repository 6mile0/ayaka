import dbCfg from "../dbCredentials.json" assert { type: "json" };
import mysql from 'mysql2';
import { EmbedBuilder } from 'discord.js';
export async function extendTime(ctnId) {
    return new Promise(async (resolve, reject) => {
        let db = mysql.createConnection(dbCfg); // データベースに接続
        try {
            db.execute(
                `SELECT created_at,expired_at,interval_id FROM users WHERE container_id = '${ctnId}'`,
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    } else {
                        console.log(res);
                        console.log(res[0]["interval_id"]);
                        clearInterval(res[0]["interval_id"]); // 既存のタイマーを解除

                        let expiredMs = res[0]["expired_at"] + 10800000;// 3時間後(自動削除予定時刻)

                        var intervalID = setInterval(() => {
                            var dt = new Date(); // 現在時刻
                            if (dt.getTime() >= expiredMs) { // 3時間後ミリ秒一致時
                                const timerEmbed = new EmbedBuilder()
                                    .setColor("#ED4245")
                                    .setTitle('あなたのコンテナは停止されました')
                                    .setDescription("3時間経過し、延長申請がなかったためコンテナを削除しました。\nご利用ありがとうございました。")
                                    .addFields(
                                        { name: 'コンテナ名', value: cfg.containerName },
                                        { name: '作成者', value: interaction.user.username },
                                        { name: '作成日時', value: cfg.createdTime.toLocaleString('ja-JP') },
                                    )
                                    .setTimestamp()
                                interaction.channel.send({ embeds: [timerEmbed] });

                                setTimeout(() => { // 3時間後にコンテナを削除
                                    Promise.all([shitDownAyaka(ctnId), delRecord(ctnId)]).then((res) => {
                                        console.log(res);
                                        if (res[0] == ctnId) {
                                            const message = new EmbedBuilder()
                                                .setColor(0X32CD32)
                                                .setTitle('ご利用ありがとうございました')
                                                .setDescription("下記のコンテナを削除しました。")
                                                .addFields(
                                                    { name: 'コンテナ名', value: res[0] },
                                                )
                                                .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                                            interaction.reply({ embeds: [message] });
                                        } else {
                                            const message = new EmbedBuilder()
                                                .setColor(0xFF0000)
                                                .setTitle('エラーが発生しました')
                                                .setDescription("[E1001] コンテナの削除に失敗しました。")
                                                .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                                            interaction.reply({ embeds: [message] });
                                        }
                                    }).catch((err) => {
                                        console.log(err);
                                        const message = new EmbedBuilder()
                                            .setColor(0xFF0000)
                                            .setTitle('エラーが発生しました')
                                            .setDescription("[E1001] コンテナの削除に失敗しました。")
                                            .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                                        interaction.reply({ embeds: [message] });
                                    });
                                    clearInterval(intervalID);
                                });
                            }
                        }, 1000);

                        db.execute(
                            `UPDATE users SET expired_at = '${expiredMs}',interval_id = '${intervalID}' WHERE container_id = '${ctnId}'`,
                            function (err, res) {
                                if (err) {
                                    console.log(err);
                                    reject(err);
                                } else {
                                    console.log(res);
                                    console.log(intervalID);
                                    resolve([expiredMs, ctnId]);
                                }
                            }
                        );
                    }
                }
            );
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}
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
                    reject([e]); // 例外1
                }
    });
}