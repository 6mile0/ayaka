import globalCfg from "./config.json" assert { type: "json" }; // 設定ファイル読み込み
import { Client, GatewayIntentBits, Collection, EmbedBuilder } from 'discord.js';
import { getCtnId, delRecord } from './functions/containerDelete.js';
import { extendTime, buttonKillAyaka} from './functions/containerManager.js';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { getDbData } from "./functions/getContainerData.js";
var app = express();
app.set("view engine", "ejs");
app.set("views", "./views");
var server = app.listen(3000, function () {
    console.log(`Webパネル ${server.address().port}番での待受準備が出来ました`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const client = new Client({
    intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b)
});

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


console.log(`${globalCfg.botName} ${globalCfg.ver} を起動します...`);
client.once("ready", async () => {
    client.user.setPresence({ activities: [{ name: "Ver " + globalCfg.ver }] });
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
                .setDescription("[E1001] コンテナの起動に失敗しました。")
                .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
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
                console.log(ctnInfo[0]);
                Promise.all([buttonKillAyaka(ctnInfo[0]), delRecord(ctnInfo[0])]).then((res) => {
                    console.log(res[0]);
                    if (res[0] == ctnInfo[0]) {
                        const message = new EmbedBuilder()
                            .setColor(0X32CD32)
                            .setTitle('ご利用ありがとうございました')
                            .setDescription("下記のコンテナを削除しました。")
                            .addFields(
                                { name: 'コンテナ名', value: ctnInfo[1] },
                                { name: 'コンテナID', value: ctnInfo[0] },
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
            }).catch((err) => {
                console.log(err);
                const message = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('エラーが発生しました')
                    .setDescription("削除するコンテナが見つかりませんでした。")
                    .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                interaction.reply({ embeds: [message] });
            });

            // ==================================================
            // 延長ボタンが押されたとき
            // ==================================================
        } else if (interaction.customId === "extend") {
            await getCtnId(userId).then((ctnInfo) => { // コンテナID・コンテナ名を取得
                console.log(ctnInfo[0]);
                extendTime(ctnInfo[0]).then((res) => {
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
                        .setTimestamp()
                    interaction.reply({ embeds: [timerEmbed] });
                }).catch((err) => {
                    console.log(err);
                    const message = new EmbedBuilder()
                        .setColor(0xFF0000)
                        .setTitle('エラーが発生しました')
                        .setDescription("コンテナの延長に失敗しました。")
                        .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                    interaction.reply({ embeds: [message] });
                });
            }).catch((err) => {
                console.log(err);
                const message = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('エラーが発生しました')
                    .setDescription("削除するコンテナが見つかりませんでした。")
                    .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
                interaction.reply({ embeds: [message] });
            });
            // ==================================================
            // エクスポートボタンが押されたとき
            // ==================================================
        } else if (interaction.customId === "export") {
            await interaction.reply({
                content: "エクスポートボタンが押されました。"
            });
        }
    }
});

client.login(globalCfg.token);

// ==================================================
// Webパネル用
// ==================================================

app.get("/lists", async function (req, res) {
    let result = await getDbData()
    let container_list = new Array();
    if (result.length == 0){
        res.render("list",{
            container_list:["","","","",""]
        })
    }else{

    for(var i = 0; i < result.length; i++){
        let user = (await client.users.fetch(result[i]["user_id"])).username;
        let expired_at = new Date(result[i]["expired_at"]).toLocaleString('ja-JP');
        let created_at = new Date(result[i]["created_at"]).toLocaleString('ja-JP');
        container_list.push(Array(user, result[i]["container_name"], result[i]["available_ports"], created_at, expired_at))
    }
    res.render("list",{
        container_list: container_list
    });
}
});
