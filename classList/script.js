// TODO: 集中講義のマスを作る -> カレンダーの下?

// TODO: "対象科類の授業のみ表示する"ボタンの実装
// TODO: カレンダーを上に表示していると講義一覧で登録/削除したときに表示が上下するので、可能であれば[どこかをタップしたら横/上下から出てくる]形にできると良さそう...?
// TODO: 可能であればS1/S2をカレンダー上で区別できると嬉しい(でもどうやって?)

// 取得した講義データの要素(一例)
// {
//   "code":"30921",
//   "type":"総合",
//   "category":"Ｆ（数理・情報）",
//   "semester":"Ｓ",
//   "periods":["木3"],
//   "classroom":"駒場1号館 184教室, 駒場1号館 192教室",
//   "titleJp":"図形科学Ｂ",
//   "lecturerJp":"腰原 幹雄",
//   "ccCode":"CAS-GC1F22L1",
//   "credits":"2.0",
//   "detail":"３次元立体形状の図的表現および形状処理について、手描作図に基づいた図法幾何学を通して学び、立体形状の把握・伝達・構想能力を養う。\n主な項目は以下のとおり。\n１.投影法1.1 投影―投影の原理,各種投影法1.2 軸測投影,透視投影\n２.正投影による空間図形の表現と解析2.1 点・直線・平面―主・副投影,直線の実長,平面の実形,交わり2.2 基本的立体―多面体,(円)錐,(円)柱,球,その他の曲面2.3 基本立体の交わり―切断,相貫",
//   "schedule":"■「第１週」（4/5～4/11）の授業をオンラインにより実施する。\n■「第２週」（4/13）以降は、原則対面授業とする。\n\n1.投影1.1 投影法の分類1.2 平行投影の基本的性質\n2.点2.1 主投影の枠組み2.2 各象限における点の表現2.3 点の副投影 \n3.直線と平面3.1 直線の表現3.2 平面の表現3.3 二直線、二平面、直線と平面の表現\n4.基本的な立体4.1 多面体4.2 円錐と円柱4.3 球4.4 円錐・円柱の内接球表現\n5.立体と直線・平面の交わり5.1 立体と直線の交点5.2 平面による立体の切断\n6.図形の回転6.1 図形の回転の表現6.2 軌跡円錐に関する作図6.3 回転運動に関する基本的作図\n7.立体の接触7.1 接平面7.2 立体の接触\n8.立体と立体の交わり8.1 多面体の相貫8.2 各種立体の相貫",
//   "methods":"参考書・補助プリントをもとに解説する。\n5～8回のレポート（作図問題）を課す。\n\n作図を行うため、A3程度の用紙、三角定規、コンパスを容易すること。",
//   "evaluation":"試験と平常点",
//   "notes":"オンライン受講に必要なPCとネット環境は各自準備してください。\nオンライン授業URLは準備中ですので、授業前日以降に確認して当日授業開始時刻にアクセスしてください。\nまた、ITC-LMSで教材を配布することがありますので、適宜確認するようにしてください。\n\n授業の講義や演習は90分で実施するが，午前は授業終了後の15分間，午後は授業開始前の15分間を質疑応答等の時間とすることを原則とする．担当教員によって実施の詳細が異なる可能性があるので，担当教員からの指示・説明に注意すること．",
//   "class":"1年 文科 理科 2年 文科 理一(1-4,9,21,26,31-34,39)",
//   "one_grade":["l1_all","l2_all","l3_all","s1_all","s2_all","s3_all"],
//   "two_grade":["l1_all","l2_all","l3_all","s1_1","s1_2","s1_3","s1_4","s1_9","s1_21","s1_26","s1_31","s1_32","s1_33","s1_34","s1_39"]
// }


// 以下、前のシステムのコードを借りました

// テキストの全角英数字, 全角スペース, 空文字を除去する
// 小文字にはしないので検索時は別途toLowerCase()すること
function normalizeText(text) {
  return text.trim().replace(/[\s　]+/g, " ").replace(
    /[Ａ-Ｚａ-ｚ０-９]/g,
    s => String.fromCharCode(s.charCodeAt(0) - 65248)
  );
}

// 系列の短縮表現を得る
function getShortenedCategoryName(text) {
  switch (text) {
      case "Ｌ（言語・コミュニケーション）": return "L";
      case "Ａ（思想・芸術）": return "A";
      case "Ｂ（国際・地域）": return "B";
      case "Ｃ（社会・制度）": return "C";
      case "Ｄ（人間・環境）": return "D";
      case "Ｅ（物質・生命）": return "E";
      case "Ｆ（数理・情報）": return "F";
      default: return "";
  }
}

// 評価方法の短縮表現を得る
function getShortenedEvaluationMethod(text) {
  if (!text) return "不明";
  return [
      /試験|(期末|中間)テスト|(E|e)xam/.test(text) ? "試験" : "",
      /レポート|提出|課題|宿題|(A|a)ssignments|(R|r)eport|(H|h)omework|(P|p)aper/.test(text) ? "レポ" : "",
      /出席|出欠|参加|(A|a)ttendance|(P|p)articipation/.test(text) ? "出席" : "",
      /平常点|小テスト/.test(text) ? "平常" : "",
  ].join("");
}

// 講義場所の短縮表現を得る
// 分かりにくいかもしれない表示についてここで補足
// 1. 大半の表示は、"(1~2桁の建物番号)**"
// 2. ただし、"900" -> 講堂 となるので注意
// 3. "10-***" -> 10号館
// 4. "E**" -> 情報教育棟
// 5. "(West/East) K***" -> 21KOMCEE
// 6. "KALS" = 17号館2階
// 7. "アドミニ棟" = アドミニストレーション棟
// 8. "コミプラ" = コミュニケーションプラザ
// TODO: ここの部分をドキュメントにしてページに載せたほうが良い?
function getShortenedClassroom(text) {
  if (text.includes(",")) {
    return text.split(",").map(getShortenedClassroom).join('<br>');
  }
  if (!text) {
    return "不明";
  }
  if (/ E?[-\d]+(教室)?$/.test(text)) {
    const classroom = text.match(/ (E?[-\d]+)(教室)?$/)[1];
    return classroom === "900" ? "講堂" : classroom;
  }
  if (/^21KOMCEE (East|West) K\d+$/.test(text)) {
    return text.replace(/^21KOMCEE (East|West) (K\d+)$/, "$1 $2");
  }
  if (/^その他\(学(内|外)等\)/.test(text)) {
    return "他(学" + text.match(/^その他\(学(内|外)等\)/)[1] + "等)";
  }
  if (text.includes("KALS")) {
    return "KALS";
  }
  if (text.includes("コミュニケーションプラザ")) {
    return text.replace("コミュニケーションプラザ", "コミプラ");
  }
  if (text.includes("アドミニストレーション棟")) {
    return text.replace("アドミニストレーション棟", "アドミニ棟");
  }
  return text;
}

// 全講義データ
const allLectureDB = (async () => {
  const weekNameJpToEn = {
    '月': 'monday',
    '火': 'tuesday',
    '水': 'wednesday',
    '木': 'thursday',
    '金': 'friday',
  };
  const allClassListUrl = './classList/data-beautified2023.json';
  const response = await fetch(allClassListUrl);
  const allLectureList = await response.json();
  for (lec of allLectureList) {
    lec.semester = normalizeText(lec.semester);
    lec.titleJp = normalizeText(lec.titleJp);
    lec.lecturerJp = normalizeText(lec.lecturerJp);
    lec.detail = normalizeText(lec.detail);
    // 週間表のidを英語名にしているため、英語名を作っておく
    lec.periodsEn = lec.periods.map(periodsJp => {
      const weekNameJp = periodsJp.charAt(0);
      const time = periodsJp.charAt(1);
      return weekNameJpToEn[weekNameJp] + time;
    });
    lec.shortenedCategoryname = lec.type + getShortenedCategoryName(lec.category);
    lec.shortenedClassroom = getShortenedClassroom(lec.classroom);
    lec.shortenedEvaluationmethod = getShortenedEvaluationMethod(lec.evaluation);
  }
  console.log(allLectureList);
  return allLectureList;
})();


// TODO: registered...の更新とカレンダーの更新をまとめる
// TODO: registered...の擬似的なゲッターを作る?
// registered...の引数をリストにする?(取り回しが本当に向上するのか?)
// そもそもlistではなくsetのほうが良いのではないか、codeのsetと組み合わせたオブジェクトにしてしまって、存在判定はそちらで行うのが良いのではないかという案もある

// TODO: forcreditに入っている「代表」が消えるとカレンダーでの表示が消える問題
// 上述の問題を解決するには、この辺りのロジックに大きな修正が必要?
let registeredLecturesList = [];
let registeredLecturesListForCredit = []; //単位計算＆表示用に同名の授業は1つだけ登録

// 単位数を計算し、表示に反映させる
const creditCounter = document.getElementById('credit-counter');
function updateCreditsCount() {
  let sum = 0;
  for (const c of registeredLecturesListForCredit) {
    sum += Number(c.credits);
  }
  if (creditCounter !== null) {
    creditCounter.textContent = sum;
  }
}

// 授業が登録されているか
function isLectureRegistered(lecture) {
  return registeredLecturesList.some(
    l => l.code === lecture.code
  );
}

// 同じ授業が登録されていないなら、登録リストに授業を入れる
function registerLectureToList(lecture) {
  if (!(isLectureRegistered(lecture))){
    registeredLecturesList.push(lecture);
    if (!(registeredLecturesListForCredit.some(
      element => element.titleJp === lecture.titleJp
    ))) {
      registeredLecturesListForCredit.push(lecture);
    }
  }
}

// 登録リストから授業を削除する
function deleteLectureFromList(lecture) {
  registeredLecturesList = registeredLecturesList.filter(
    l => l.code !== lecture.code
  );
  registeredLecturesListForCredit = registeredLecturesListForCredit.filter(
    l => l.code !== lecture.code
  );
}

// 登録リストを初期化する
// TODO: クリアボタン(検索条件リセット)の実装 -> これを呼び出す
function clearLectureList() {
  // TODO: ここでテーブルの再生成をしたいので、searchの曜限をCalenderCellから解放したい
  registeredLecturesList = [];
  registeredLecturesListForCredit = [];
}


// 表示用のテーブル(科目一覧)の作成方法:
//  1. データベースに全データを格納
//  2. 検索ごとにテーブル要素を再生成する
//  3. 生成の際に、clickされた際のイベントを登録する
//  4. ここで、行に対してonclickを設定することによって、授業詳細の表示を設定できそう

// テーブルのヘッダーを得る
function getLectureTableHeader() {
  const header = document.createElement("thead");
  header.innerHTML = `
<tr>
  <th>学期</th>
  <th>曜限</th>
  <th>種別</th>
  <th>科目名</th>
  <th>教員</th>
  <th>場所</th>
  <th>評価方法</th>
  <th>コード</th>
  <th>登録</th>
</tr>
`;
  return header;
}

// 講義情報からテーブルの行(ボタン含む)を生成する
function getLectureTableRow(lec) {
  const fragment = document.createElement("tbody");
  fragment.innerHTML = `
<tr id=tr${lec.code}>
  <td>${lec.semester}</td>
  <td>${lec.periods.join('<br>')}</td>
  <td>${lec.shortenedCategoryname}</td>
  <td>${lec.titleJp}</td>
  <td>${lec.lecturerJp}</td>
  <td>${lec.shortenedClassroom}</td>
  <td>${lec.shortenedEvaluationmethod}</td>
  <td>${lec.code}</td>
</tr>
`;
  const tr = fragment.firstElementChild;

  // TODO: 講義テーブルの(登録/削除ボタン除く)行クリックで講義の詳細を見られるようにする
  // tr.addEventListener("onclick", 講義の詳細を表示する関数);
  // バブリングを防ぐために、checkboxにonclick->stopPropagationが必要?

  const tdOfButton = document.createElement("td");

  // 以下、登録/削除ボタン(新バージョン)の生成
  // checkboxを活用

  const checkbox = document.createElement("input");
  const label = document.createElement("label");
  checkbox.type = "checkbox";

  // labelがcheckboxを参照できるよう、ユニークなIDを生成
  const checkboxId = `checkbox-${lec.code}`;
  checkbox.id = checkboxId;
  label.htmlFor = checkboxId;

  // 講義テーブル生成時に、登録状況に合わせてボタン表示を適切な状態にする
  if (isLectureRegistered(lec)) {
    checkbox.click();
    label.textContent = "削除";
  } else {
    label.textContent = "追加";
  }

  // クリック時の挙動を設定
  checkbox.onchange = () => {
    if (checkbox.checked) {
      registerLectureToList(lec);
      label.textContent = "削除";
    } else {
      deleteLectureFromList(lec);
      label.textContent = "追加";
    }
    updateCalenderAndCreditsCount(lec.periodsEn);
  };

  // 行に要素として追加
  tdOfButton.appendChild(checkbox);
  tdOfButton.appendChild(label);
  tr.appendChild(tdOfButton);

  //詳細表示ボタン
  const showDetailButton = document.createElement("button");
  showDetailButton.textContent = "詳細表示"
  showDetailButton.onclick = () => {
    detail.innerHTML = `
    <p><strong style="color: red">${lec.titleJp}</strong> taught by ${lec.lecturerJp}</p>
    <p>${lec.type + "科目 " + lec.category}</p>
    <p style="color:#0d0">開講学期</p>
    <p>${lec.semester}</p>
    <p style="color:#0d0">対象クラス</p>
    <p>${lec.class}</p>
    <p style="color:#0d0">単位数</p>
    <p>${lec.credits}</p>
    <p style="color:#0d0">実施場所</p>
    <p>${lec.classroom}</p>
    <p style="color:#0d0">曜限</p>
    <p>${lec.periods}</p>
    <p style="color:#0d0">詳細</p>
    <p>${lec.detail}</p>
    <p style="color:#0d0">講義計画</p>
    <p>${lec.schedule}</p>
    <p style="color:#0d0">講義方法</p>
    <p>${lec.methods}</p>
    <p style="color:#0d0">評価</p>
    <p>${lec.evaluation}</p>
    <p style="color:#0d0">注意</p>
    <p>${lec.notes}</p>

    `

  }
  tr.children[3].appendChild(showDetailButton);

  return tr;
}

// 講義情報のリストを受け取り、テーブルを生成・表示する
const lectureTableElement = document.getElementById('search-result');
function setLectureTable(lectureList) {
  const newTableContent = document.createDocumentFragment();
  newTableContent.appendChild(getLectureTableHeader());
  const newTableBody = document.createElement("tbody");
  for (lec of lectureList) {
    newTableBody.appendChild(getLectureTableRow(lec));
  }
  newTableContent.appendChild(newTableBody);
  lectureTableElement.replaceChildren(newTableContent);
}


// アスキーアートを挿入する
const askiiArtBox = document.getElementById("askiiArt");
async function setAskiiArt() {
  const numberOfAskiiArts = 2;
  const randomNumber = Math.floor(Math.random() * (numberOfAskiiArts)) + 1;
  const response = await fetch(`./classList/error${randomNumber}.txt`);
  const askiiArt = await response.text();
  askiiArtBox.innerHTML = askiiArt;
  askiiArtBox.innerHTML += ["","<div>虚偽の情報を伝えることは、情報統合思念体としても、私個人としても望まれることではない。</div><div>---sleeping forever---</div>"][randomNumber - 1];
  // document.write("少し、頭冷やそうか。")
  // document.write("おイタしちゃだめにょろよ。")
}

// アスキーアートを削除する
function resetAskiiArt() {
  askiiArtBox.innerHTML = "";
}


// Promise([1年必修の一覧, 2年必修の一覧])
const hisshuDB = Promise.all([
  "./classList/requiredLecture2023.json",
  "./classList/requiredLecture2023_2.json",
].map(async url => (await fetch(url)).json()));

// 所属クラスから必修の授業を自動で登録するメソッド
async function registerHisshu(classId, grade) {
  // 一旦登録授業をすべてリセット
  // その際に、登録されていた授業の「削除」ボタンをすべてクリックして戻す
  for (const lecture of registeredLecturesList) {
    const button = document.getElementById(`checkbox-${lecture.code}`);
    if (button && button.checked) {
      button.click();
    }
  }
  clearLectureList();
  
  const appliedHisshuDB = (await hisshuDB)[(grade === "first") ? 0 : 1];
  if (classId in appliedHisshuDB) {
    resetAskiiArt();
    const requiredLectureCodeList = appliedHisshuDB[classId];
    for (const lecture of (await allLectureDB).filter(
      lec => requiredLectureCodeList.includes(lec.code)
    )) {
      registerLectureToList(lecture);
      const button = document.getElementById(`checkbox-${lecture.code}`);
      if (button && !(button.checked)) {
        button.click();
      }
    }
  } else {
    setAskiiArt();
  }
  
  // 多分、登録が一通り終わったあとに表示の更新を1回すれば大丈夫そう
  updateCalenderAndCreditsCount();

  console.log("今登録されている授業は");
  console.log(registeredLecturesList);
}

const weekNameEnToJp = {
  'monday': '月',
  'tuesday': '火',
  'wednesday': '水',
  'thursday': '木',
  'friday': '金',
};

const searchStatus = document.getElementById("search-status");

// カレンダーのマス
class CalenderCell {
  constructor(week, time) {
    this.week = week; // 曜日名英語小文字
    this.time = time; // 時限名整数
    if (this.week in weekNameEnToJp) {
      this.weekJp = weekNameEnToJp[this.week];
    }
    this.id = `${this.week}${this.time}`; // 各td要素のid
    this.idJp = `${this.weekJp}${this.time}`; // 月1,火2,とか
    this.element = document.getElementById(this.id);
    this.element.setAttribute("class", "calender empty");
    this.element.onclick = () => {
      console.log('search working!');
      this.search();
    }
  }

  // 講義をカレンダーに書き込む
  writeInCalender() {
    this.element.innerHTML = ""; // 一旦リセット
    console.log(`writing in ${this.idJp}`);
    let preLecture = "";
    for (
        const lecture of registeredLecturesList.filter(
          (lec) => (lec.periods.includes(this.idJp)) /*曜限が同じ授業だけ*/
        )
      ){
      console.log(this.element.innerHTML);
      if (!this.element.innerHTML /*まだその曜限に授業が入ってない*/) {
        this.element.innerHTML = lecture.titleJp;
      } else if (
        lecture.titleJp !== this.element.innerHTML && lecture.titleJp !== preLecture /*同名の授業は1つだけ表示*/
      ) {
        this.element.innerHTML += `<br>${lecture.titleJp}`;
      }
      preLecture = lecture.titleJp;
    }
    if (this.element.innerHTML) {
      this.element.setAttribute("class", "calender registered");
    } else {
      this.element.innerHTML = `${this.idJp}検索`
      this.element.setAttribute("class", "calender empty");
    }
  }

  async search() {
    setLectureTable((await allLectureDB).filter(
      l => l.periods.includes(this.idJp)
    ));
    searchStatus.textContent = `${this.idJp}の授業を表示しています`    
  }
}

// 検索時にかけるフィルタ
// lec.semester = normalizeText(lec.semester);
// lec.titleJp = normalizeText(lec.titleJp);
// lec.lecturerJp = normalizeText(lec.lecturerJp);
// lec.detail = normalizeText(lec.detail);

// 多分マスターから絞り込んだ結果を返す関数も必要...

// 検索機能は、
// マスターデータベースを参照し、絞り込みの結果を返す
// -> それをテーブル生成関数に入れて表示する

// 検索機能強化の準備
// 何で検索したいか?
// フリーワード
// 学期
// 評価方法
// 分類(系列)
// 曜限
function searchAndRefleshTable() {
  // これから書く
}

// CalenderCellは最初に1回のみ生成し、その後はそれを更新するようにした
const calenderCellMaster = [];
const periodsEnToCalenderMasterIndex = {};
let n = 0;
for (const day in weekNameEnToJp) {
  for (let i = 1; i <= 6; i++) {
    calenderCellMaster.push(new CalenderCell(day, i));
    periodsEnToCalenderMasterIndex[day + i.toString()] = n;
    n++;
  }
}

// カレンダーの対応するセルを更新する
// (引数はperiodsEn形式)
function updateCalender(periodsEn){
  if (periodsEn === undefined) {
    console.log("updating all periods");
    for (cell of calenderCellMaster) {
      cell.writeInCalender();
    }
  } else {
    for (const period of periodsEn) {
      console.log(`updating ${period}`);
      cell = calenderCellMaster[periodsEnToCalenderMasterIndex[period]];
      cell.writeInCalender();
    }
  }
}

// 指定曜限の表示(カレンダー/それを元に単位数も)を更新する。指定のない場合は全曜限を更新する
function updateCalenderAndCreditsCount(periodsEn){
  updateCalender(periodsEn);
  updateCreditsCount();
}

const hisshuAutoFillButton = document.getElementById("hisshu-autofill");
// formのvalueを受け取る
hisshuAutoFillButton.onclick = () => {
  const valueKarui = document.getElementById("selectKarui").value;
  const valueClassNumber = document.getElementById("classNumber").value;
  const classId = valueKarui + "_" + valueClassNumber;
  const grade = document.getElementById("grade").value;
  console.log(classId);
  registerHisshu(classId, grade);
};

// デフォルトの表示として、全講義をテーブルに載せる
(async () => setLectureTable(await allLectureDB))();
