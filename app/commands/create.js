import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { asighnPorts, makeUserFolder, startUpAyaka, addProxy, addRecord } from "../functions/containerCreate.js";
import { errorMsg, successMsg } from "../functions/common.js"; // 共通関数フレームの読み込み
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { nanoid, customAlphabet } from 'nanoid';
const random = customAlphabet('1234567890abcdef', 16);

export default {
    data: new SlashCommandBuilder()
        .setName('create')
        .setDescription('コンテナ型独立開発環境を立ち上げることができます。3hで自動停止しますが、延長をすることが可能です。'),
    async execute(interaction) {
        console.log(interaction.user);

        try {
            const ports = await asighnPorts(interaction.user.id); // 利用可能ポートを取得
            // 異常系
            if (!(ports[0] == 0) && (ports[1] == "C0001")) throw ['あなたは既にコンテナをお持ちです', 'C0001', '申し訳ありませんが，コンテナは現在お一人一つまでとさせて頂いております。'];
            if (!(ports[0] == 0) && (ports[1] == "C0002")) throw [ports[2], 'C0002', 'コンテナの作成に失敗しました．詳細はエラーログをご確認ください。'];

            const containerInfo = {
                "serviceDomain": globalCfg.SERVICEDOMAIN, // サービスドメイン
                "ctnId": random(12), // コンテナID
                "userId": interaction.user.id, // ユーザーID
                "containerName": "ayaka-" + random(8), // コンテナ名
                "pass": nanoid(20), // パスワード
                "sudoPass": nanoid(32), // sudoパスワード
                "port": ports[1], // 利用可能ポート
                "nowIimeMs": 0,
                "expiredMs": 0,
                "createdTime": new Date(), // 生成時間
                "expiredTime": new Date(), // 削除予定時刻
                "intervalID": 0 // タイマーID
            };

            // 結果を格納する配列
            let result = [];

            // コンテナ作成処理
            makeUserFolder(containerInfo).then((res1) => {
                if (res1 != 0) throw new Error('フォルダ作成に失敗しました。');
                console.log(res1);
                result.push(res1);
                return startUpAyaka(containerInfo, interaction);
            }).then((res2) => {
                if (res2 != 0) throw new Error('コンテナ起動に失敗しました。');
                console.log(res2);
                result.push(res2);
                return addProxy(containerInfo);
            }).then((res3) => {
                if (res3 != 0) throw new Error('プロキシ設定に失敗しました。');
                console.log(res3);
                result.push(res3);
                return addRecord(containerInfo);
            }).then((res4) => {
                if (res4 != 0) throw new Error('レコード追加に失敗しました。');
                console.log(res4);
                result.push(res4);
                return result;
            }).then(async (res) => {
                console.log(res);
                if (!(res[0] == 0 && res[1] == 0 && res[2] == 0 && res[3] == 0)) throw ['引数が合いません。作成処理に失敗した可能性があります。'];

                // コンテナ作成通知
                await successMsg(interaction, 'コンテナの作成に成功しました', 'DMにコンテナへの接続情報を送信しました．\n只今より3時間で自動停止します．(DMのボタンより随時延長が可能です)');

                const message = new EmbedBuilder()
                    .setColor(0x32cd32)
                    .setTitle('コンテナが準備できたよ！')
                    .setDescription("開発環境の生成が完了しました。以下の情報を確認してください。")
                    .addFields(
                        { name: 'アクセスURL', value: `${containerInfo.serviceDomain}/attach/${containerInfo.ctnId}/login` },
                        { name: 'コンテナ名', value: containerInfo.containerName },
                        { name: 'エディタログインパスワード', value: "`" + containerInfo.pass + "`" },
                        { name: 'sudoパスワード', value: "`" + containerInfo.sudoPass + "`" },
                        { name: '生成日時', value: containerInfo.createdTime.toLocaleString('ja-JP') },
                        { name: '自動削除予定日時', value: containerInfo.expiredTime.toLocaleString('ja-JP') },
                        { name: '利用可能ポート', value: String(containerInfo.port) },
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
                            .setLabel("データをエクスポートする(鋭意実装中)")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                    )
                    .addComponents(
                        new ButtonBuilder()
                            .setLabel("コンテナ一覧")
                            .setURL(`${globalCfg.SERVICEDOMAIN}/cp/lists`)
                            .setStyle(ButtonStyle.Link)
                    )
                await interaction.user.send({
                    embeds: [message], components: [controlBtn]
                });
            }).catch(async (e) => {
                
                // コンテナ作成失敗
                if (e.length == 3) errorMsg(interaction, e[0], e[1], e[2]);
                else await errorMsg(interaction, e);
            });

        } catch (e) {
            // ポートの割り当てに失敗
            console.log(e);
            if (e.length == 3) errorMsg(interaction, e[0], e[1], e[2]);
            else await errorMsg(interaction, e);
        }
    },
};