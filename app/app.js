import globalCfg from "./config.json" assert { type: "json" }; // 設定ファイル読み込み
import ayaka from './commands/ayaka.js';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
const client = new Client({
    intents: Object.values(GatewayIntentBits).reduce((a, b) => a | b)
});

// ========================================================
// [Add] スラッシュコマンド読み込み
// 2022/12/31
// ========================================================
client.commands = new Collection();
client.commands.set(ayaka.data.name, ayaka);

// ========================================================

console.log(globalCfg.botname + " " + globalCfg.ver + " を起動します");

client.once("ready", async () => {
    client.user.setPresence({ activities: [{ name: "Ver " + globalCfg.ver }] });
    console.log("準備完了");
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

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
    }
});


client.on('clickButton', async (button) => {
    console.log(button);
});

client.login(globalCfg.token);