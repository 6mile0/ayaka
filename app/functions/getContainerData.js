import mysql from 'mysql2';
import dbCfg from "../dbCredentials.json" assert { type: "json" };
export function getDbData() {
    return new Promise(async (resolve, reject) => {
        let db = mysql.createConnection(dbCfg);
        try {
            db.execute(
                `SELECT * from users;`,
                function (err, res) {
                    //console.log(res);
                    if (err) {
                        console.log(err);
                        reject(err);
                    }
                    //console.log(res);
                    if (res.length == 0) {
                        resolve("レコードが存在しません");
                    } else {
                        resolve(res);
                    }
                }
            );
        } catch (err) {
            console.log(err);
            reject(err);
        }
    }
    );
}
