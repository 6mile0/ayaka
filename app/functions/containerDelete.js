import dbCfg from "../dbCredentials.json" assert { type: "json" };
import { execSync } from 'node:child_process';
import mysql from 'mysql2';

// =====================================================================
// コンテナID取得関数
// =====================================================================

export async function getCtnId(userId) {
    return new Promise((resolve, reject) => {
        let db = mysql.createConnection(dbCfg); // データベースに接続
        try {
            db.execute(
                `SELECT container_id,container_name FROM users WHERE user_id = ${userId}`,
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    console.log(res);
                    if (res.length == 0) {
                        reject("レコードが存在しません");
                    } else {
                        const ctnId = res[0].container_id; // コンテナIDを取得(最新のもの)
                        const ctnName = res[0].container_name; // コンテナIDを取得(最新のもの)
                        resolve([ctnId, ctnName]);
                    }
                }
            );
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
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
                    reject([e]); // 例外1
                }
            } else {
                console.log(res);
                reject(`${ctnId}の外部接続設定に失敗しました`);
            }
        } catch {
            reject("外部接続設定の解除で例外が発生しました");
        }
    });
}

// =====================================================================
// データベースからレコードを削除する関数
// =====================================================================

export async function delRecord(ctnId) {
    return new Promise((resolve, reject) => {
        let db = mysql.createConnection(dbCfg); // データベースに接続
        try {
            db.execute(
                `DELETE FROM users WHERE container_id = "${ctnId}"`,
                function (err, res) {
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    console.log(res);
                    resolve(ctnId); // コンテナ削除成功
                }
            );
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}
