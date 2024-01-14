import { DriveModule } from "./DriveModule.js";

// helloをkey、worldをvalueにして保存
DriveModule.Instance().setItem("hello","world").then(res => console.log(res));

// key=hello に対応するvalueを取得
//DriveModule.Instance().getItem("hello").then(res => console.log(res));

// key=hello を削除
//DriveModule.Instance().removeItem("hello").then(res => console.log(res));

// アカウントを削除
//DriveModule.Instance().deleteAccount().then(res => console.log(res));
