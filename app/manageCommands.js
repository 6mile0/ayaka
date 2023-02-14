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
    if (process.argv.length < 3) {
        console.log('引数が足りないか，不正です。');
        return;
    } else {
        if (process.argv[2] === '0') {
            try {
                console.log(`${commands.length} 個のアプリケーションコマンドを削除します。`);

                const data = await rest.put(
                    Routes.applicationGuildCommands(cfg.clientId, cfg.guildId),
                    { body: [] },
                );

                console.log(`${data.length} 個のアプリケーションコマンドを削除しました。`);
            } catch (error) {
                console.error(error);
            }
        } else if (process.argv[2] === '1') {
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
        }
    }
})();