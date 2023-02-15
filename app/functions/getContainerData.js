import dotenv from 'dotenv';
const globalCfg = dotenv.config().parsed; // 設定ファイル読み込み
import mysql from 'mysql2/promise';
const dbCfg = {
    host: globalCfg.DB_HOST,
    user: globalCfg.DB_USER,
    password: globalCfg.DB_PASS,
    database: globalCfg.DB_NAME,
}

export async function getDbData() {
    let db = await mysql.createConnection(dbCfg);
    try {
        let [row] = await db.execute("SELECT user_id,container_name,available_ports,created_at,expired_at FROM users");
        if (row.length == 0) {
            return [0, "0"];
        } else {
            return [0, row];
        }
    } catch (err) {
        console.log(err);
        return [1, err];
    }
}