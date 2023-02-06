import globalCfg from "./config.json" assert { type: "json" }; // 設定ファイル読み込み
import dbCfg from "./dbCredentials.json" assert { type: "json" };
import { Client, GatewayIntentBits, Collection, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import mysql from 'mysql2';
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

async function getCtnId(userId) {
    return new Promise((resolve, reject) => {
        let db = mysql.createConnection(dbCfg); // データベースに接続
        try {
            db.execute(
                `SELECT container_id FROM users WHERE user_id = ${userId}`,
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    console.log(res);
                    if (!res) {
                        reject("コンテナが見つかりません");
                    } else {
                        try {
                            const ctnId = res[res.length - 1].container_id; // コンテナIDを取得(最新のもの)
                            resolve(ctnId);
                        } catch (e) {
                            console.log(e);
                            reject("コンテナが見つかりません");
                        }
                    }
                }
            );
        } catch (err) {
            console.log(err);
            reject(err);
        } finally {
            db.end();
        }
    });
}

async function shitDownAyaka(ctnId) {
    return new Promise((resolve, reject) => {
        try {
            var res = execSync(`docker exec ayaka-nginx-1 sh /etc/nginx/conf.d/remove.sh ${ctnId}`); // ポートを削除
            if (res.toString().trim() == "Reloading nginx: nginx.") {
                console.log(ctnId);
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
            } else {
                console.log(res);
                reject(`${ctnId}の外部接続設定に失敗しました`);
            }
        } catch {
            reject("外部接続設定の解除で例外が発生しました");
        }
    });
}

async function delRecord(ctnId) {
    return new Promise((resolve, reject) => {
        let db = mysql.createConnection(dbCfg); // データベースに接続
        try {
            db.execute(
                `DELETE FROM users WHERE container_id = "${ctnId}"`,
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    console.log(res);
                    resolve(ctnId); // コンテナ削除成功
                }
            );
        } catch (err) {
            console.log(err);
            reject(err);
        } finally {
            db.end();
        }
    });
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
        if (interaction.customId === "stop") {
            var ctnId = await getCtnId(interaction.user.id);
            console.log(ctnId);

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
                    interaction.reply({ ephemeral: true, embeds: [message] });
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
        } else if (interaction.customId === "extend") {
            await interaction.reply({
                content: "延長ボタンが押されました。",
                ephemeral: true
            });
        } else if (interaction.customId === "export") {
            await interaction.reply({
                content: "エクスポートボタンが押されました。",
                ephemeral: true
            });
        }
    }
});

client.login(globalCfg.token);