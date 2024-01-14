import waitUntil from "./asyncWaitUntil.js";
import * as err from "./error.js";
import { getAccessTokenCookie, setAccessTokenCookie } from "./cookieUtil.js";
import * as key from "./key.js";
/**
 * google authを行うモジュール
 */
export class AuthModule {
    failedToLoadModule = { hasError: false, message: "" };
    async initialize() {
        this.failedToLoadModule = { hasError: false, message: "" };
        if (!this.gapiInited) {
            this.addScriptElement("https://apis.google.com/js/api.js", () => {
                this.gapiLoaded((err) => this.failedToLoadModule = { hasError: true, message: err });
            });
        }
        if (!this.gisInited) {
            this.addScriptElement("https://accounts.google.com/gsi/client", () => {
                this.gisLoaded((err) => this.failedToLoadModule = { hasError: true, message: err });
            });
        }
        // どちらもロードされるまで待機
        await waitUntil(() => this.gisInited && this.gapiInited || this.failedToLoadModule.hasError, { timeout: 1000000 });
        if (this.failedToLoadModule.hasError)
            return;
        if (gapi.client.getToken() == null) {
            // Auth
            this.signin();
        }
        // 完了するまで待機
        await waitUntil(() => this.hasTokenObtained || this.failedToLoadModule.hasError, { timeout: 1000000 });
    }
    /**
     * 外部モジュールは import で読み込めない
     * そのため、htmlに<script/>要素を追加してモジュールをロードする
     * @param url 外部モジュールのurl
     * @param onloaded 外部モジュールがロードされた時に呼ばれるコールバックメソッド
     */
    addScriptElement(url, onloaded) {
        // <script />要素作成
        const script_gapi = document.createElement("script");
        // urlを指定して外部スクリプトをロードする
        // import from では外部スクリプトをロードすることができない
        script_gapi.src = url;
        // ロードが完了したらthis.gapiLoaded()を呼ぶ
        script_gapi.onload = onloaded;
        // script要素をhtmlに追加する
        document.body.appendChild(script_gapi);
    }
    tokenClient = null;
    // gis, gapiの二つの外部モジュールを使用することでgoogle apiを呼び出す。
    // これらがロードされたか否かを表すフラグ
    gisInited = false;
    gapiInited = false;
    // gapiのロード時に同時に読み込むスクリプト
    static DiscoveryDoc = [
        "https://script.googleapis.com/$discovery/rest?version=v1",
        "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"
    ];
    /**
     * Google Identity Services (???)のロード完了のコールバック関数
     * initTokenClient(???)の初期化を行う
     */
    gisLoaded(onError) {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: key.VITE_CLIENT_ID,
            scope: key.VITE_SCOPES,
            callback: tokenRes => {
                // トークンの期限
                const expires_in = Number.parseInt(tokenRes.expires_in);
                // 期限 - 6分をクッキーの期限に設定
                setAccessTokenCookie(tokenRes.access_token, expires_in - 360);
                this.hasTokenObtained = true;
            },
            error_callback: onError,
        });
        this.gisInited = true;
    }
    /**
     * googleのサービスのAPIを叩くモジュール(api.js)のロード完了のコールバック関数
     * initializeGapiClientを呼び、gapi.clientの初期化を行う
     */
    gapiLoaded(onError) {
        gapi.load('client', () => this.initializeGapiClient(onError));
    }
    /**
     * API clientが初期化された際のコールバックメソッド.
     * discovery doc を読み込む
     */
    async initializeGapiClient(onError) {
        try {
            await gapi.client.init({
                apiKey: key.VITE_API_KEY,
                discoveryDocs: AuthModule.DiscoveryDoc,
            });
            this.gapiInited = true;
        }
        catch (err) {
            onError(err);
        }
    }
    /**
     *  SignInボタンがクリックされた時の挙動
     */
    signin() {
        const tokenCookie = getAccessTokenCookie();
        if (tokenCookie != undefined) {
            gapi.client.setToken({ access_token: tokenCookie });
            this.hasTokenObtained = true;
        }
        else {
            if (this.tokenClient != null) {
                // すでにトークンを取得済みか否かで場合わけ
                if (gapi.client.getToken() == null) {
                    // 持っていない場合は新しく取得
                    this.tokenClient.requestAccessToken({ prompt: 'consent' });
                }
                else {
                    // 持っている場合はスキップ
                    this.tokenClient.requestAccessToken({ prompt: '' });
                }
            }
        }
    }
    /**
     * アクセストークンが取得済みか否か
     */
    hasTokenObtained = false;
    /**
     * google driveのapiを返す
     */
    async auth() {
        const hasToken = getAccessTokenCookie() != null;
        if (!this.gapiInited || !this.gisInited) {
            await this.initialize();
        }
        else if (!hasToken) {
            this.hasTokenObtained = false;
            this.signin();
            await waitUntil(() => this.hasTokenObtained, { timeout: 1000000 });
        }
        if (this.failedToLoadModule.hasError) {
            return err.Err_LoadModule(this.failedToLoadModule.message);
        }
        return null;
    }
    /**
     *  Sign out the user upon button click.
     */
    signout() {
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token, () => {
                this.hasTokenObtained = false;
            });
            gapi.client.setToken(null);
        }
    }
}
