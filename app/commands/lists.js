import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
export default {
    data: new SlashCommandBuilder()
        .setName('lists')
        .setDescription('現在起動中のコンテナを表示します。'),
    async execute(interaction) {
        console.log(interaction.user);
        const message = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('テスト')
            .setDescription("テスト")
        interaction.reply({ embeds: [message] });
    },
};