import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
export default {
    data: new SlashCommandBuilder()
        .setName('lists')
        .setDescription('現在起動中のコンテナを表示します。'),
    async execute(interaction) {
        console.log(interaction.user);
        const message = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('コンテナリストはこちら')
            .setDescription("http://localhost:8080/lists")
            .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
        interaction.reply({ embeds: [message] });
    },
};