import globalCfg from "../config.json" assert { type: "json" };
import dbCfg from "../dbCredentials.json" assert { type: "json" };
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { execSync } from 'node:child_process';
import { nanoid, customAlphabet } from 'nanoid';
import fs from 'node:fs';
import mysql from 'mysql2';

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
            .setFooter({ text: `ayaka Ver ${globalCfg.ver} `, iconURL: globalCfg.icon });
        interaction.reply({ embeds: [message] });
    },
};