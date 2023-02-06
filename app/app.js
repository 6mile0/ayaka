import globalCfg from "./config.json" assert { type: "json" }; // 設定ファイル読み込み
import { Client, GatewayIntentBits, Collection, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';

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