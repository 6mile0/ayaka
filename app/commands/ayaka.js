const { SlashCommandBuilder } = require('discord.js');
const client = new discord.Client();
const discordbtn = require('discord.js-buttons')(client);
const { puId, pgId, mntPoint } = require('../config.json');
const fs = require('node:fs');
const { exec, execSync } = require('child_process');
var Datastore = require('nedb');
var db = new Datastore({
    filename: '../db/users.db',
    autoload: true
});

const startUpAyaka = async (userid, ctnId, pass, sudoPass) => {
    exec(`docker run -d --name=${ctnId} -e PUID=${puId} -e PGID=${pgId} -e TZ=Asia/Tokyo -e PASSWORD=${pass} -e SUDO_PASSWORD=${sudoPass} -e DEFAULT_WORKSPACE=userFolder/workspace -p 8443:8443 -v ${mntPoint}/${userid}/userFolder:/userFolder --restart unless-stopped ami/all`, { timeout: 10000 },
        function (error, stdout, stderr) {
            // シェル上でコマンドを実行できなかった場合のエラー処理
            if (error !== null) {
                if (!stderr) {
                    reject([5, error]); // E1003
                } else {
                    try {
                        fs.writeFile(`/Containers/${containerName}/run/output.txt`, stderr, er => { if (er) throw er });
                    } catch {
                        reject([4, er]); // E1002
                    }
                    reject([6, stderr, `/Containers/${containerName}/run/output.txt`]); // E1004
                }
            }

            try {
                // 標準出力をファイルに出力
                fs.writeFile(`/Containers/${containerName}/run/output.txt`, stdout, er => { if (er) throw er });
            } catch {
                reject([4, er]); // E1002
            }

            if (stdout.length == 0) {
                // 標準出力が空の場合
                resolve([0, "", `/Containers/${containerName}/run/output.txt`]); // 実行結果返却
            } else {
                resolve([0, stdout, `/Containers/${containerName}/run/output.txt`]);  // 実行結果返却
            }
        });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayakaを起動する')
        .setDescription('コンテナ型独立開発環境を立ち上げることができます。3hで自動停止しますが、延長をすることが可能です。'),
    async execute(interaction) {
        const user = interaction.user;
        await startUpAyaka();
        await interaction.reply(`はじめまして！${user.username}さん、いつも使う言語は${defaultLang}なんだね！覚えておくね。rinをよろしく(^^)`);
    },
};