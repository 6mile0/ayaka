import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { Client, GatewayIntentBits, Collection, EmbedBuilder } from 'discord.js';
import { getCtnId, delRecord } from './functions/containerDelete.js';
import { extendTime, delUserDir } from './functions/containerManager.js';
import { killAyaka } from './functions/containerDelete.js';
import { getDbData } from "./functions/getContainerData.js";
import { errorMsg } from './functions/common.js';
import fs from 'node:fs';
import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ==================================================
// Express関連
// ==================================================
var app = express();
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.static(__dirname + '/public'));
var server = app.listen(globalCfg.PORTALPORT, function () {
    console.log(`Webパネル ${server.address().port}番での待受準備が出来ました`);
});


// ==================================================
// Discord.js関連
// ==================================================

const client = new Client({
    intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b)
});
client.login(globalCfg.TOKEN);
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = await import(filePath);
    if ('data' in command.default && 'execute' in command.default) {
        client.commands.set(command.default.data.name, command.default);
    } else {
        console.log(`${filePath} に必要な "data" か "execute" がありません。`);
    }
}

console.log(`${globalCfg.BOTNAME} ${globalCfg.VER} を起動します...`);
client.once("ready", async () => {
    client.user.setPresence({ activities: [{ name: "Ver " + globalCfg.VER }] });
    console.log("準備完了");
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            console.error(`${interaction.commandName} が見つかりません。`);
            return;
        }
        try {
            await command.execute(interaction);
        } catch (error) {
            // 想定外の例外をキャッチ
            console.error(error);
            const message = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('エラーが発生しました')
                .setDescription("コマンドの実行に失敗しました。")
                .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
            interaction.reply({ ephemeral: true, embeds: [message] });
            return;
        }
    } else { // コマンド以外のインタラクション
        console.log(interaction.customId);
        const userId = interaction.user.id; // ユーザーIDを取得

        // ==================================================
        // 停止ボタンが押されたとき
        // ==================================================
        if (interaction.customId === "stop") {
            await getCtnId(userId).then((ctnInfo) => { // コンテナID・コンテナ名を取得
                console.log(ctnInfo[0]); // コンテナIDを表示
                console.log(ctnInfo[1]); // コンテナ名を表示

                // 結果を格納する配列
                let result = [];

                // 直列処理
                killAyaka(ctnInfo[0], ctnInfo[1]).then((res1) => {
                    if (res1[0] == ctnInfo[0]) throw new Error('コンテナの停止に失敗したか、プロキシ連携解除に失敗しました。');
                    console.log(res1);
                    result.push(res1);
                    return delRecord(ctnInfo[0]); // データベースから削除
                }).then((res2) => {
                    if (res2[0] == ctnInfo[0]) throw new Error('レコードの削除に失敗しました。');
                    console.log(res2);
                    result.push(res2);
                    return result
                }).then(async (allRes) => {
                    console.log(allRes);
                    if (!(allRes[0][0] == allRes[1][0])) throw new Error('削除対象のコンテナIDが一致しません。削除処理に失敗した可能性があります。');

                    const message = new EmbedBuilder()
                        .setColor(0X32CD32)
                        .setTitle('ご利用ありがとうございました')
                        .setDescription("下記のコンテナを削除しました。")
                        .addFields(
                            { name: 'コンテナ名', value: ctnInfo[1] },
                            { name: 'コンテナID', value: ctnInfo[0] },
                        )
                        .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
                    await interaction.reply({ embeds: [message] });
                }).catch(async (e) => {
                    console.log(e);
                    // コンテナ削除に失敗した場合
                    if (e.length == 3) await errorMsg(interaction, e[0], e[1], e[2]);
                    else errorMsg(interaction, e);
                });

            }).catch(async (e) => {
                // コンテナIDが取得できなかった場合
                if (e.length == 3) await errorMsg(interaction, e[0], e[1], e[2]);
                else await errorMsg(interaction, e);
            });

            // ==================================================
            // 延長ボタンが押されたとき
            // ==================================================
        } else if (interaction.customId === "extend") {
            await getCtnId(userId).then((ctnInfo) => { // コンテナID・コンテナ名を取得
                console.log(ctnInfo[0]); // コンテナIDを表示

                extendTime(ctnInfo[0], interaction).then(async (res) => {
                    console.log(res);
                    const expiredTime = new Date(res[0]);
                    const timerEmbed = new EmbedBuilder()
                        .setColor(0X32CD32)
                        .setTitle('あなたのコンテナの削除期限が延長されました')
                        .setDescription("下記のコンテナの削除期限が3時間延長されました。")
                        .addFields(
                            { name: 'コンテナ名', value: ctnInfo[0] },
                            { name: 'コンテナID', value: ctnInfo[1] },
                            { name: '作成者', value: interaction.user.username },
                            { name: '自動削除予定日時', value: expiredTime.toLocaleString('ja-JP') },
                        )
                        .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
                    await interaction.reply({ embeds: [timerEmbed] });
                }).catch(async (e) => {
                    // コンテナ削除日時の延長に失敗した場合
                    if (e.length == 3) await errorMsg(interaction, e[0], e[1], e[2]);
                    else await errorMsg(interaction, e);
                });
            }).catch(async (e) => {
                // コンテナIDが取得できなかった場合
                if (e.length == 3) await errorMsg(interaction, e[0], e[1], e[2]);
                else await errorMsg(interaction, e);
            });
            // ==================================================
            // リセットボタンが押されたとき
            // ==================================================
        } else if (interaction.customId === "reset") {
            await delUserDir(userId).then(async (res) => {
                console.log(res);
                const timerEmbed = new EmbedBuilder()
                    .setColor(0X32CD32)
                    .setTitle('あなたのコンテナのユーザデータがリセットされました')
                    .setDescription("拡張機能やワークスペースが初期化されています。\n万が一削除されていない場合は開発者までご連絡ください。")
                    .addFields(
                        { name: '所有者', value: String(interaction.user.username) },
                        { name: '対象ユーザID', value: String(userId) },
                    )
                    .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
                await interaction.reply({ embeds: [timerEmbed] });
            }).catch(async (e) => {
                // ユーザーディレクトリの削除に失敗した場合
                if (e.length == 3) await errorMsg(interaction, e[0], e[1], e[2]);
                else await errorMsg(interaction, e);
            });
        } else if (interaction.customId === "link") {
            await interaction.reply({
                content: "エクスポートボタンが押されました。"
            });

        } else if (interaction.customId === "export") {
            await interaction.reply({
                content: "エクスポートボタンが押されました。"
            });
        }
    }
});

// ==================================================
// Webパネル用
// ==================================================
app.get("/lists", async function (req, res) {
    let resData = await getDbData(); // DBからデータを取得
    if (!(resData[0] == 0)) { // 異常系
        res.render("list", { ver: globalCfg.VER, ctnArr: "取得時にエラーが発生しました", ctnCnt: -1 })
    } else { // 正常系
        if (resData[1] == "0") { // データがない場合
            res.render("list", { ver: globalCfg.VER, ctnArr: "データがありません", ctnCnt: 0 })
        } else {
            let arr = [];
            let data = resData[1];
            for (var i = 0; i < resData[1].length; i++) {
                let user = await client.users.fetch(data[i]["user_id"]);
                let expired_at = new Date(data[i]["expired_at"]).toLocaleString('ja-JP');
                let created_at = new Date(data[i]["created_at"]).toLocaleString('ja-JP');
                arr.push([user.username, data[i]["container_name"], data[i]["available_ports"], created_at, expired_at])
            }
            res.render("list", { ver: globalCfg.VER, ctnArr: arr, ctnCnt: arr.length });
        }
    }
});

app.get("/resource", async function (req, res) {
    res.render("resource", { ver: globalCfg.VER });
});

app.get("/help", async function (req, res) {
    res.render("help", { ver: globalCfg.VER });
});