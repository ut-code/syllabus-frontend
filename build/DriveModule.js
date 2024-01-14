import { removeAccessTokenCookie } from "./cookieUtil.js";
import { AuthModule } from "./AuthModule.js";
import * as err from "./error.js";
/**
 * Google Driveにデータを保存するためのapiを提供するクラス
 * local storage のインターフェースと揃えている。
 *
 * - setItem (key valueペアを追加する)
 * - getItem (keyを指定してvalueを取得する)
 * - deleteAllItem (ファイルを削除する)
 */
export class DriveModule {
    constructor() {
        this.authModule = new AuthModule();
    }
    static instance;
    static Instance() {
        if (DriveModule.instance == null) {
            DriveModule.instance = new DriveModule();
        }
        return DriveModule.instance;
    }
    // authを行うクラス
    authModule;
    // セーブファイルのメタデータ
    static FILE_METADATA = {
        name: "userData.json", // ファイル名
        parents: ['appDataFolder'], // 保存場所として appDataFolder を指定
        mimeType: "text/plain"
    };
    // 現在drive fileの操作中か否か
    isBusy = false;
    /**
     * ユーザーデータファイルを取得
     * AppDataフォルダに配置するファイルは1つであることを想定している。
     * その唯一のファイルを返す
     *
     * 1. モジュールを用いてappdataフォルダー内の全てのファイルを取得
     * 2. ファイルがない場合はundefined、1つである場合はそのファイルを、複数の場合はエラーを返す
     */
    async getUserDataFile() {
        // 1. appdataフォルダ内のファイルを取得
        const res = await gapi.client.drive.files.list({ spaces: "appDataFolder" });
        // 2a. ファイルが存在しない場合はundefinedを返す
        if (res.result.files == undefined || res.result.files.length == 0)
            return undefined;
        // 2b. ファイルが複数存在する場合は想定していない
        else if (res.result.files.length > 1)
            return err.Err_DriveFileNumber();
        // 唯一のファイルを返す
        else
            return res.result.files[0];
    }
    /**
     * AppDataフォルダ内にファイルを作成する
     *
     * 1. ファイルを複数作成することは想定していない場合は。既にファイルが存在していた場合はエラーを返す。
     * 2. ファイルを作成し、それを返す。
     *
     * @returns 作成したファイル
     */
    async createFile() {
        // 1. ファイル数の確認
        const noFile = (await this.getUserDataFile()) == undefined;
        if (!noFile)
            return err.Err_CreateSecondFile();
        // 2. ファイルを作成して返す
        const res = await gapi.client.drive.files.create({ resource: DriveModule.FILE_METADATA });
        if (Math.round(res.status / 100) == 2)
            return res.result;
        else
            return err.Err_CreateFile(res.statusText);
    }
    /**
     * ファイル内容を上書きする。
     *
     * 更新したいファイルの内容を引数として受け取る。
     * 1. ユーザーデータのファイルが既にドライブ上に存在することを確認する。
     * 2. この内容をシリアル化する
     * 3. 更新リクエストを飛ばす
     *
     * @param saveFileInfo この引数の内容でデータを更新する
     */
    async updateFile(saveFileInfo) {
        // 1. ファイルが存在することを確認
        const userDataFile = await this.getUserDataFile();
        if (err.IsError(userDataFile))
            return userDataFile;
        if (userDataFile == undefined)
            return err.Err_NoFileToUpdate();
        // 2. シリアル化
        const blob = new Blob([JSON.stringify(saveFileInfo.content)], { type: 'text/plain' });
        // 3. 更新リクエストを飛ばす
        const res = await fetch(
        // apiのurl
        `https://www.googleapis.com/upload/drive/v3/files/${saveFileInfo.fileId}`, 
        // 更新内容
        {
            // 
            method: 'PATCH',
            headers: new Headers({
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`,
                'Content-Type': 'text/plain'
            }),
            // 内容
            body: blob
        });
        // 通信にエラーがある場合はエラーを返す
        if (Math.round(res.status / 100) != 2)
            return err.Err_UpdateFile(res.statusText);
    }
    /**
     * userDataの内容を取得
     *
     * 1. getUserDataFileでファイルを取得
     * 2. 内容をSaveFileInfoに整形する
     */
    async getUserData() {
        // 1. ファイルの取得
        const userDataFile = await this.getUserDataFile();
        if (err.IsError(userDataFile))
            return userDataFile;
        if (userDataFile == null)
            return null;
        // 2. Idや内容を抜き出す
        const fileId = userDataFile.id;
        const res = await gapi.client.drive.files.get({ fileId: fileId, alt: "media" });
        // 返す
        if (Math.round(res.status / 100) == 2)
            return { fileId: fileId, content: JSON.parse(res.body) };
        else
            return err.Err_GetFile(res.statusText);
    }
    /**
     * key, valueペアを(上書き)保存する。
     *
     * 1. Driveに保存されたデータを取得
     * 2. 初めてデータの保存を行う場合
     *     2-a. ファイルの作成
     *     2-b.初期データを作成
     * 3. key に対する value を更新
     * 4. ファイルをアップデートする
     *
     * @param key セーブしたいkey
     * @param value セーブしたいvalue
     */
    async setItem(key, value) {
        try {
            // Auth
            const authRes = await this.authModule.auth();
            if (err.IsError(authRes))
                return authRes;
            // ネットワークに接続されていることを確認
            if (!window.navigator.onLine)
                return err.Err_Network();
            if (key == "")
                return err.Err_Argument("keyとして空文字が渡されました。");
            this.isBusy = true;
            // 1. Driveに保存されたデータを取得
            let saveData = await this.getUserData();
            if (err.IsError(saveData))
                return saveData;
            // 2. nullの場合(まだデータを保存したことがない場合)
            if (saveData == null) {
                // 2-a. ファイルを作成
                const userFile = await this.createFile();
                if (err.IsError(userFile))
                    return userFile;
                // 2-b. 初期データを設定
                saveData = { fileId: userFile.id, content: {} };
            }
            // 3. key value pairを更新
            saveData.content[key] = value;
            // 4. ファイルをアップデート
            var res = await this.updateFile(saveData);
            if (err.IsError(res))
                return res;
        }
        catch (e) {
            // 想定外のエラー
            console.error("データの保存に失敗しました");
            console.error(e);
            return err.Err_Unknown(err);
        }
        finally {
            this.isBusy = false;
        }
    }
    /**
     * userDataの key に対する value を取得
     *
     *  1. ファイルを読み込む
     *  2. 受け取ったkeyに対応するValueを返す
     *
     * @returns userDataの内容
     */
    async getItem(key) {
        try {
            // Auth
            const authRes = await this.authModule.auth();
            if (err.IsError(authRes))
                return authRes;
            // ネットワークに接続されていることを確認
            if (!window.navigator.onLine)
                return err.Err_Network();
            if (key == "")
                return err.Err_Argument("keyとして空文字が渡されました。");
            this.isBusy = true;
            // 1. ファイルを読み込む
            const file = await this.getUserData();
            if (err.IsError(file))
                return file;
            // ファイルがない場合(まだユーザーデータをドライブ上に保存したことがない)
            // undefinedを返す
            if (file == null)
                return undefined;
            // 2. ファイルが見つかった場合、受け取ったkeyに対応するValueを返す
            return file.content[key];
        }
        catch (e) {
            // 想定外のエラー
            console.error("データの取得に失敗しました");
            console.error(e);
            return err.Err_Unknown(e);
        }
        finally {
            this.isBusy = false;
        }
    }
    /**
     * userDataの key に対する value を削除
     *
     *  1. ファイルを読み込む
     *  2. 受け取ったkeyに対応するValueを削除
     *  3. 更新を保存する
     *
     * @returns 対象のkeyが存在し、削除できた場合にtrueをかえす
     */
    async removeItem(key) {
        try {
            // Auth
            const authRes = await this.authModule.auth();
            if (err.IsError(authRes))
                return authRes;
            // ネットワークに接続されていることを確認
            if (!window.navigator.onLine)
                return err.Err_Network();
            if (key == "")
                return err.Err_Argument("keyとして空文字が渡されました。");
            this.isBusy = true;
            // 1. ファイルを読み込む
            const file = await this.getUserData();
            if (err.IsError(file))
                return file;
            // ファイルがない場合(まだユーザーデータをドライブ上に保存したことがない)
            // falseを返す
            if (file == null)
                return false;
            // 削除を試みる
            if (file.content.hasOwnProperty(key)) {
                // 指定のキーが存在する場合は削除
                const { [key]: deletedKey, ...newContent } = file.content;
                // 更新
                file.content = newContent;
                // 保存
                const res = await this.updateFile(file);
                if (err.IsError(res))
                    return res;
                // 削除に成功したのでtrueを返す
                return true;
            }
            else {
                // 削除するキーがないためfalseを返す
                return false;
            }
        }
        catch (e) {
            // 想定外のエラー
            console.error("データの取得に失敗しました");
            console.error(e);
            return err.Err_Unknown(e);
        }
        finally {
            this.isBusy = false;
        }
    }
    /**
     * ファイルごとユーザーデータを削除する
     *
     * 1. ユーザーファイルを取得
     * 2. 取得したファイルのidを指定して削除する
     *
     */
    async deleteAccount() {
        try {
            removeAccessTokenCookie();
            // Auth
            const authRes = await this.authModule.auth();
            if (err.IsError(authRes))
                return authRes;
            // ネットワークに接続されていることを確認
            if (!window.navigator.onLine)
                return err.Err_Network();
            this.isBusy = true;
            // ユーザーファイルを取得
            const file = await this.getUserDataFile();
            if (err.IsError(file))
                return file;
            // なければ何もしない
            if (file == null)
                return;
            // 取得したファイルを削除する
            const res = await gapi.client.drive.files.delete({ fileId: file.id });
            if (Math.round(res.status / 100) != 2) {
                this.authModule.signout();
                return err.Err_DeleteFile(res.statusText);
            }
        }
        catch (e) {
            console.error("データの削除に失敗しました");
            console.error(e);
            return err.Err_Unknown(e);
        }
        finally {
            this.isBusy = false;
        }
    }
}
