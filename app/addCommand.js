import { REST, Routes } from 'discord.js';
import cfg from './config.json' assert { type: 'json' };
import fs from 'node:fs';

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = await import(`./commands/${file}`);
    commands.push(command.default.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(cfg.token);

(async () => {
    try {
        console.log(`${commands.length} 個のアプリケーションコマンドを登録します。`);

        const data = await rest.put(
            Routes.applicationGuildCommands(cfg.clientId, cfg.guildId),
            { body: commands },
        );

        console.log(`${data.length} 個のアプリケーションコマンドを登録しました。`);
    } catch (error) {
        console.error(error);
    }
})();