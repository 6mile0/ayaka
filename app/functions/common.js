import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { EmbedBuilder } from 'discord.js';

// ===========================================
// 共通関数フレーム
// ===========================================

// インタラクションに対してエラーメッセージを返す関数
// ※ボタンやスラッシュコマンド使用時限定
// commands/create.js, app.jsで使用
export async function replyErrorMsg(
    interaction, e = "NULL", code = "E9999", msg = "想定外のエラーが発生しました。操作をやめ，開発者に連絡してください。") {
    console.log(e, code, msg);
    const message = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('エラーが発生しました')
        .setDescription(msg)
        .addFields(
            { name: "エラーコード", value: code },
            { name: 'エラー内容', value: "```" + e + "```" },
        )
        .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
    await interaction.reply({ embeds: [message] });
}

// 一般エラーメッセージを返す関数
export async function errorMsg(
    interaction, e = "NULL", code = "E9999", msg = "想定外のエラーが発生しました。操作をやめ，開発者に連絡してください。") {
    console.log(e, code, msg);
    const message = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('エラーが発生しました')
        .setDescription(msg)
        .addFields(
            { name: "エラーコード", value: code },
            { name: 'エラー内容', value: "```" + e + "```" },
        )
        .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
    await interaction.channel.send({ embeds: [message] });
}

// 成功メッセージを返す関数
export async function successMsg(interaction, title = "操作に成功しました", msg) {
    const message = new EmbedBuilder()
        .setColor(0X32CD32)
        .setTitle(title)
        .setDescription(msg)
        .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
    await interaction.channel.send({ embeds: [message] });
}