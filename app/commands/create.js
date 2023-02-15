import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { asighnPorts, makeUserFolder, startUpAyaka, addProxy, addRecord } from "../functions/containerCreate.js";
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { nanoid, customAlphabet } from 'nanoid';
const random = customAlphabet('1234567890abcdef', 16);

export default {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('コンテナ型独立開発環境を立ち上げることができます。3hで自動停止しますが、延長をすることが可能です。'),
    async execute(interaction) {
        console.log(interaction.user);

        const ports = await asighnPorts(); // 利用可能ポートを取得
        const containerInfo = {
            "serviceDomain": globalCfg.SERVICEDOMAIN, // サービスドメイン
            "ctnId": random(12), // コンテナID
            "userId": interaction.user.id, // ユーザーID
            "containerName": "ayaka-" + random(8), // コンテナ名
            "pass": nanoid(20), // パスワード
            "sudoPass": nanoid(32), // sudoパスワード
            "port": ports, // 利用可能ポート
            "nowIimeMs": 0,
            "expiredMs": 0,
            "createdTime": new Date(), // 生成時間
            "expiredTime": new Date(), // 削除予定時刻
            "intervalID": 0 // タイマーID
        };

        Promise.all([makeUserFolder(containerInfo), startUpAyaka(containerInfo, interaction), addProxy(containerInfo), addRecord(containerInfo)]).then((res) => {
            console.log(res);
            if (res[0] == 0 && res[1] == 0 && res[2] == 0 && res[3] == 0) {
                console.log("メッセージ送信を行います");
                const successfulCreate = new EmbedBuilder()
                    .setColor(0x32cd32)
                    .setTitle('コンテナの作成に成功しました')
                    .setDescription("DMにコンテナへの接続情報を送信しました．\n只今より3時間で自動停止します．(DMのボタンより随時延長が可能です)")
                    .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
                interaction.reply({ embeds: [successfulCreate] });

                const message = new EmbedBuilder()
                    .setColor(0x32cd32)
                    .setTitle('コンテナが準備できたよ！')
                    .setDescription("開発環境の生成が完了しました。以下の情報を確認してください。")
                    .addFields(
                        { name: 'アクセスURL', value: `${containerInfo.serviceDomain}/${containerInfo.ctnId}/login` },
                        { name: 'コンテナ名', value: containerInfo.containerName },
                        { name: 'エディタログインパスワード', value: "`" + containerInfo.pass + "`" },
                        { name: 'sudoパスワード', value: "`" + containerInfo.sudoPass + "`" },
                        { name: '生成日時', value: containerInfo.createdTime.toLocaleString('ja-JP') },
                        { name: '自動削除予定日時', value: containerInfo.expiredTime.toLocaleString('ja-JP') },
                        { name: '利用可能ポート', value: String(containerInfo.port) },
                        { name: '収容サーバ', value: "JP-01" },
                    )
                    .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });

                const controlBtn = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('stop')
                            .setLabel("コンテナ停止(削除)")
                            .setStyle(ButtonStyle.Danger),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('extend')
                            .setLabel("利用期間を延長する(3h)")
                            .setStyle(ButtonStyle.Success)
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('reset')
                            .setLabel("ディレクトリ内をリセットする")
                            .setStyle(ButtonStyle.Secondary)
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('export')
                            .setLabel("データをエクスポートする")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("コンテナ一覧")
                            .setURL(`${globalCfg.SERVICEDOMAIN}:${globalCfg.PORTALPORT}/lists`)
                            .setStyle(ButtonStyle.Link)
                    )
                interaction.user.send({
                    embeds: [message], components: [controlBtn]
                });
            } else {
                const message = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('エラーが発生しました')
                    .setDescription("[E1001] コンテナの起動に失敗しました。")
                    .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
                interaction.reply({ ephemeral: true, embeds: [message] });
            }
        }).catch((e) => {
            console.log(e);
            const message = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('エラーが発生しました')
                .setDescription("[E1001] コンテナの起動に失敗しました。")
                .setFooter({ text: `ayaka Ver ${globalCfg.VER} `, iconURL: globalCfg.ICON });
            interaction.reply({ ephemeral: true, embeds: [message] });
        });
    },
};