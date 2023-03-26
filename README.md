# syllabus-frontend
履修登録支援システム「シ楽バス」
## 環境構築

まずは Git で管理するためのディレクトリを作成し、VSCode で開きます。ターミナルを開き、次のコマンドを実行しましょう。

```bash
git init
git remote add origin git@github.com:ut-code/syllabus-frontend.git
git switch -c main
git pull origin main
npm install
```

作業するときは作業用のブランチを作りましょう
```bash
git switch -c ブランチ名
```

プレビューは一番上のディレクトリに移動して、
```bash
npx http-server
```
を実行すると見られます。
ただし、vscodeの変更は自動で反映されないので、
```txt
Ctrl + Shift + R
```
でブラウザをキャッシュ無視リロードしましょう。

作業をしたら、
```bash
git add -A
git commit -m コミットメッセージ
git push origin ブランチ名
```
(VSCodeなどでやってもよい)でpushをし、GitHubでPull Requestを作成しましょう
