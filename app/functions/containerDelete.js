import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import { execSync } from 'node:child_process';
import mysql from 'mysql2/promise';
const dbCfg = {
    host: globalCfg.DB_HOST,
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
            throw new Error('あなたの作成したコンテナは一つも存在しません。');
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
// コンテナ削除関数
// =====================================================================

export async function timerKillAyaka(ctnId) {
    return new Promise((resolve, reject) => {
        try {
            var res = execSync(`docker exec ayaka-nginx-1 sh /etc/nginx/conf.d/remove.sh ${ctnId}`); // ポートを削除
            if (res.toString().trim() == "Reloading nginx: nginx.") {
                console.log(ctnId);
                try {
                    var result = execSync(`docker kill $(docker ps -a -q -f name=${ctnId})`);
                    console.log(result.toString().trim());
                    resolve(ctnId);
                } catch (e) {
                    reject([e, 'D0002', 'コンテナの削除に失敗しました。詳細はエラーログをご確認ください。']); // 例外1
                }
            } else {
                console.log(res);
                reject([res.toString().trim(), 'D0003', `${ctnId}の外部接続設定の削除に失敗しました。詳細はエラーログをご確認ください。`]);
            }
        } catch (e) {
            reject([e, 'D0003', `${ctnId}の外部接続設定の削除に失敗しました。詳細はエラーログをご確認ください。`]); // 例外2
        }
    });
}

// =====================================================================
// データベースからレコードを削除する関数
// =====================================================================

export async function delRecord(ctnId) {
    let db = await mysql.createConnection(dbCfg); // データベースに接続
    try {
        let [res] = await db.execute(`DELETE FROM users WHERE container_id = "${ctnId}"`);
        console.log(res);
        return ctnId;
    } catch (e) {
        throw e;
    }
}
