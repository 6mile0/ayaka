import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { execSync } from 'node:child_process';
import mysql from 'mysql2/promise';
import axios from 'axios';
const dbCfg = {
    host: globalCfg.DB_HOST,
    port: 3306,
    user: globalCfg.DB_USER,
    password: globalCfg.DB_PASS,
    database: globalCfg.DB_NAME,
}

// =====================================================================
// コンテナID取得関数
// =====================================================================

export async function getCtnId(userId) {
    let db = await mysql.createConnection(dbCfg); // データベースに接続
    try {
        let [res] = await db.execute(`SELECT container_id,container_name FROM users WHERE user_id = ${userId}`);
        if (res.length == 0) {
            throw ['あなたの作成したコンテナは一つも存在しないか見つかりませんでした。', 'D0001', 'コンテナがありません。作成をお試しください。'];
        } else {
            const ctnId = res[res.length - 1].container_id; // コンテナIDを取得(最新のもの)
            const ctnName = res[res.length - 1].container_name; // コンテナIDを取得(最新のもの)
            return [ctnId, ctnName];
        }
    } catch (e) {
        throw e;
    }
}

// =====================================================================
// コンテナ削除関数(ボタン・タイマー共通)
// =====================================================================

export async function killAyaka(ctnId) {
    return new Promise(async (resolve, reject) => {
        let db = await mysql.createConnection(dbCfg); // データベースに接続
        try {
            var exsistCtn = execSync(`docker container ls -q -f name="${ctnId}"`);
            console.log(exsistCtn.toString().trim());
            if (!(exsistCtn.toString().trim() == "")) {
                var result = execSync(`docker kill $(docker ps -a -q -f name=${ctnId})`);
                console.log(result.toString().trim());
            } else {
                console.log("コンテナが存在しませんので削除をスキップします");
            }
        } catch (e) {
            reject([e, 'D0002', 'コンテナの削除に失敗しました。詳細はエラーログをご確認ください。']); // 例外1
        }
        try {
            let [res] = await db.execute(`SELECT interval_id FROM users WHERE container_id = '${ctnId}'`);
            console.log(res[0]["interval_id"]);
            clearInterval(res[0]["interval_id"]); // 既存のタイマーを解除
            console.log("タイマーを解除しました");

            const resApi = await pushApi(ctnId); // APIにプロキシ設定を削除するリクエストを送信
            console.log(resApi.data.result);
            // APIレスポンスがsuccess以外の場合はエラーを返す
            if (!(resApi.data.result == "success")) throw resApi.data.err;
            console.log("プロキシ設定を削除しました")
            resolve(ctnId);
        } catch (e) {
            reject([e]); // 例外2
        }
    });
}

async function pushApi(ctnId) {
    return await axios
        .post(`${globalCfg.APIPOINT}/remvproxy/`, {
            "service_name": "ayaka",
            "name": ctnId
        })
        .then((res) => {
            return res
        }).catch((err) => {
            return err
        });
}

// =====================================================================
// データベースからレコードを削除する関数
// =====================================================================

export async function delRecord(ctnId) {
    return new Promise(async (resolve, reject) => {
        let db = await mysql.createConnection(dbCfg); // データベースに接続
        try {
            let [res] = await db.execute(`DELETE FROM users WHERE container_id = "${ctnId}"`);
            console.log(res);
            resolve(ctnId);
        } catch (e) {
            reject([e]);
        }
    });
}
