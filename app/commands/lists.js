import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lists')
        .setDescription('現在起動中のコンテナを表示します。'),
    async execute(interaction) {
        console.log(interaction.user);
        const message = new EmbedBuilder()
            .setColor(0XE22B8A)
            .setTitle('コンテナリスト')
            .setDescription(`下記URLをクリックしてアクセスしてください．\nhttps://${globalCfg.DOMAIN}/lists`)
            .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
        interaction.reply({ embeds: [message] });
    },
};