import Cookies from "./js-cookie.js";
const TOKEN_COOKIE_NAME = 'access_token';
export const setAccessTokenCookie = (token, expires_in) => {
    // 期限をセット
    const expirationDate = new Date();
    expirationDate.setSeconds(expirationDate.getSeconds() + expires_in);
    // Cookieに保存
    Cookies.set(TOKEN_COOKIE_NAME, token, { expires: expirationDate });
};
export const getAccessTokenCookie = () => {
    // Cookieからアクセストークンを取得
    return Cookies.get(TOKEN_COOKIE_NAME);
};
export const removeAccessTokenCookie = () => {
    // Cookieからアクセストークンを削除
    Cookies.remove(TOKEN_COOKIE_NAME);
};
