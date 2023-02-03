import globalCfg from "./config.json" assert { type: "json" }; // 設定ファイル読み込み
import { Client, GatewayIntentBits, Collection } from 'discord.js';
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

console.log(globalCfg.botname + " " + globalCfg.ver + " を起動します");

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
            console.error(error);
            await interaction.reply({ content: 'エラーが発生しました。', ephemeral: true });
            return;
        }
    } else { // コマンド以外のインタラクション
        console.log(interaction.customId);
        if (interaction.customId === "stop") {
            await interaction.reply({
                content: "停止ボタンが押されました。",
                ephemeral: true
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