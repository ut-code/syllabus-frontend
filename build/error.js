export class ErrorInfo {
  constructor(code, title, message, err) {
      this.code = code;
      this.title = title;
      this.message = message;
      this.error = err;
  }
  syllabusBackendError = true;
  code;
  title;
  message;
  error;
}
export const IsError = (maybeError) => typeof maybeError === "object" &&
  maybeError !== null &&
  // as Target で型の予測を効かせて typo を防ぐ
  typeof maybeError.syllabusBackendError === "boolean";
export function Err_Unknown(err) {
  return new ErrorInfo(1, "unknown error", "想定されていないエラーが発生しました。", err);
}
export function Err_Network() {
  return new ErrorInfo(1001, "network error", "インターネットに接続されていません。", null);
}
export function Err_LoadModule(err) {
  return new ErrorInfo(1002, "loading module error", "外部モジュールのロードに失敗しました。", err);
}
export function Err_Auth(err) {
  return new ErrorInfo(1003, "auth error", "アカウントの認証に失敗しました。", err);
}
export function Err_DriveFileNumber() {
  return new ErrorInfo(2001, "file number error", "AppDataフォルダ内にファイルが複数存在しており、ユーザーデータファイルを特定できません。", null);
}
export function Err_CreateSecondFile() {
  return new ErrorInfo(2002, "creating second file", "2つ目のファイルを作成しようとしました。AppDataフォルダ内にファイルを複数作成することは想定していません。", null);
}
export function Err_CreateFile(message) {
  return new ErrorInfo(2003, "failed creating file", message ?? "", null);
}
export function Err_NoFileToUpdate() {
  return new ErrorInfo(2004, "no file to update", "ドライブ上にユーザーデータファイルが存在しないためアップデートできませんでした。", null);
}
export function Err_UpdateFile(message) {
  return new ErrorInfo(2005, "failed updating file", message ?? "", null);
}
export function Err_GetFile(message) {
  return new ErrorInfo(2006, "failed getting file", message ?? "", null);
}
export function Err_DeleteFile(message) {
  return new ErrorInfo(2007, "failed delete file", message ?? "", null);
}
export function Err_Argument(message) {
  return new ErrorInfo(10001, "argument error", message, null);
}
