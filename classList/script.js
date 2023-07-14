"use strict";

const lastUpdated = "2023S";

// TODO: カレンダー/講義詳細を[どこかをタップしたら横/上下から出てくる]形にする案はある(実際やる必要があるかは怪しい)
// TODO: 可能であればS1/S2をカレンダー上で区別できると嬉しい(でもどうやって?)
// TODO: 講義詳細の改行がない -> 要素にinnerTextで解決しそう
// TODO: 講義詳細にも追加/削除ボタンを追加?

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

// TODO: registered...の更新とカレンダーの更新をまとめる
// TODO: registered...の擬似的なゲッターを作る?
// registered...の引数をリストにする?(取り回しが本当に向上するのか?)

const registeredLectures = new Map();
const registeredLecturesForCredit = new Map(); // 単位計算＆表示用に同名の授業は1つだけ登録

// 授業が登録されているか
function isLectureRegistered(lecture) {
  return registeredLectures.has(lecture.code);
}

// 同じ授業が登録されていないなら、登録リストに授業を入れる
function registerLecture(lecture) {
  if (!(isLectureRegistered(lecture))){
    registeredLectures.set(lecture.code, lecture);
    if ([...registeredLecturesForCredit.values()].every(
      element => element.titleJp !== lecture.titleJp
    )) {
      registeredLecturesForCredit.set(lecture.code, lecture);
    }
  }
}

// 登録リストから授業を削除する
function unregisterLecture(lecture) {
  registeredLectures.delete(lecture.code);
  registeredLecturesForCredit.delete(lecture.code);
}

// 登録リストを初期化する
// TODO: クリアボタン(検索条件リセット)の実装 -> これを呼び出す
function clearRegisteredLectures() {
  // TODO: ここでテーブルの再生成をしたいので、searchの曜限をCalendarCellから解放したい
  registeredLectures.clear();
  registeredLecturesForCredit.clear();
}

// 単位数を計算し、表示に反映させる
const creditCounter = document.getElementById('credit-counter');
function updateCreditsCount() {
  let sum = 0;
  for (const c of registeredLecturesForCredit.values()) {
    sum += Number(c.credits);
  }
  if (creditCounter !== null) {
    creditCounter.textContent = sum;
  }
}


// フリーワード検索時にかけるフィルタ
// lecture.semester.toLowerCase();
// lecture.titleJp.toLowerCase();
// lecture.lecturerJp.toLowerCase();
// lecture.detail.toLowerCase();

// TODO: 何個もある必修の同名授業をsquashする機能 -> データベースに手を加える必要がある
// TODO: 検索系ボタンをまとめてヘッダーに飛ばす

// 追加したい検索フィルタ
// 曜限
// フリーワード

const searchConditionMaster = {
  semester: {
    S_: true,
    S1: true,
    S2: true,
  },
  evaluation: {
    exam: 'ignore',
    paper: 'ignore',
    attendance: 'ignore',
    participation: 'ignore',
  },
  category: {
    foundation: false,
    requirement: false,
    thematic: false,
    intermediate: false,
    L: true,
    A: true,
    B: true,
    C: true,
    D: true,
    E: true,
    F: true,
  },
  registration: {
    unregistered: true,
    registered: true,
  },
}
if (lastUpdated.endsWith('A')) {
  searchConditionMaster.semester = {
    A_: true,
    A1: true,
    A2: true,
  };
};
const searchConditionMasterInit = {};
for (const [key, value] of Object.entries(searchConditionMaster)) {
  searchConditionMasterInit[key] = Object.assign({}, value);
}
function resetSearchCondition() {
  for (const [key, value] of Object.entries(searchConditionMasterInit)) {
    Object.assign(searchConditionMaster[key], value);
  }
}

const conditionNameTable = {
  semester: '学期',
  S_: 'S',
  S1: 'S1',
  S2: 'S2',
  A_: 'A',
  A1: 'A1',
  A2: 'A2',

  evaluation: '評価方法',
  exam: '試験',
  paper: 'レポ',
  attendance: '出席',
  participation: '平常',

  category: '種別',
  foundation: '基礎',
  requirement: '要求',
  thematic: '主題',
  intermediate: '展開',
  L: '総合L',
  A: '総合A',
  B: '総合B',
  C: '総合C',
  D: '総合D',
  E: '総合E',
  F: '総合F',

  registration: '登録',
  unregistered: '未登録',
  registered: '登録済',

  periods: '曜限',
  title: '科目名',
  lecturer: '教員',
  // classroom: '場所',
  // code: 'コード',
  credits: '単位',
}

function generateBinaryButtonForHeader(category, name, isHalf = false) {
  // 以下、登録/削除ボタン(checkboxを活用)の生成
  const checkbox = document.createElement("input");
  const label = document.createElement("label");
  checkbox.type = "checkbox";
  checkbox.name = `${category}-${name}`;
  label.className = "header-binary-button";
  label.tabIndex = 0;
  label.role = "button";

  if (searchConditionMaster[category][name]) {
    checkbox.checked = true;
  }

  // labelがcheckboxを参照できるよう、ユニークなIDを生成
  const checkboxId = `checkbox-${category}-${name}`;
  checkbox.id = checkboxId;
  label.htmlFor = checkboxId;
  label.textContent = conditionNameTable[name];

  checkbox.addEventListener('change', () => {
    searchConditionMaster[category][name] = checkbox.checked;
    console.log(`${category}-${name} -> ${checkbox.checked}`);
    updateLectureTableBody();
    searchStatus.textContent = "";
  });
  label.addEventListener('keydown', (ev) => {
    if ((ev.key === " ") || (ev.key === "Enter")) {
      checkbox.checked ^= true;
      ev.preventDefault();
    }
  })

  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-child' + (isHalf ? ' half' : '');
  wrapper.append(checkbox, label);
  return wrapper;
}

function generateTernaryButtonForHeader(category, name, isHalf = false) {
  const buttonStorage = [];

  const condition = ['must', 'ignore', 'reject'];
  for (const reaction of condition) {
    const radio = document.createElement("input");
    const label = document.createElement("label");
    radio.type = "radio";
    radio.name = `${category}-${name}`;
    label.className = condition.at(condition.indexOf(reaction)-1);
    label.tabIndex = 0;
    label.role = "button";

    if (reaction === searchConditionMaster[category][name]) {
      radio.checked = true;
    }

    // labelがcheckboxを参照できるよう、ユニークなIDを生成
    const radioId = `${category}-${name}-${reaction}`;
    radio.id = radioId;
    label.htmlFor = radioId;
    label.textContent = conditionNameTable[name];

    radio.addEventListener('change', () => {
      searchConditionMaster[category][name] = reaction;
      console.log(`${category}-${name} -> ${reaction}`);
      updateLectureTableBody();
      searchStatus.textContent = "";
    });
    label.addEventListener('keydown', (ev) => {
      if ((ev.key === " ") || (ev.key === "Enter")) {
        radio.checked = true;
        buttonStorage.at(condition.indexOf(reaction)-2).label.focus();
        ev.preventDefault();
      }
    })
  
    buttonStorage.push({
      radio: radio,
      label: label,
    });
  }

  const wrapper = document.createElement("div");
  wrapper.className = "accordion-child";
  for (let i = 0; i < buttonStorage.length; i++) {
    const buttonComponent = document.createElement("div");
    buttonComponent.className = 'button-component' + (isHalf ? ' half' : '');
    buttonComponent.append(buttonStorage.at(i-1).radio, buttonStorage.at(i).label);
    wrapper.append(buttonComponent);
  }
  return wrapper;
}

// 検索のプルダウンメニュー
function pullDownMenuMaker(headName, optionList, isTernary) {
  const th = document.createElement('th');
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = conditionNameTable[headName];
  const accordionParent = document.createElement('div');
  accordionParent.className = "accordion-parent";
  const optionNodeList = [];
  const referenceButtonGenerator = isTernary
                                 ? generateTernaryButtonForHeader
                                 : generateBinaryButtonForHeader;
  for (const option of optionList) {
    optionNodeList.push(referenceButtonGenerator(headName, option, optionList.length > 5));
  }
  th.append(details);
  details.append(summary, accordionParent);
  accordionParent.append(...optionNodeList);
  return th;
}

// 表示用のテーブル(科目一覧)の作成方法:
//  1. データベースに全データを格納
//  2. 検索ごとにテーブル要素を再生成する
//  3. 生成の際に、clickされた際のイベントを登録する

// テーブルのヘッダーを得る
function generateLectureTableHeader() {
  const thead = document.createElement("thead");
  const tr = document.createElement("tr");
  for (const headName of [
    'semester',
    'periods',
    'category',
    'title',
    'lecturer',
    'evaluation',
    'credits',
    'registration',
  ]) {
    let th;
    if (headName in searchConditionMaster) {
      th = pullDownMenuMaker(
        headName,
        Object.keys(searchConditionMaster[headName]),
        headName === 'evaluation',
      );
    } else {
      th = document.createElement("th");
      th.textContent = conditionNameTable[headName];
    }
    th.classList.add([`${headName}-col`]);
    tr.append(th);
  }
  thead.append(tr);
  return thead;
}

// 講義情報からテーブルの行(ボタン含む)を生成する
function generateLectureTableRow(lecture) {
  const tr = document.createElement("tr");
  tr.insertAdjacentHTML('afterbegin', `
<td class="semester-col">${lecture.semester}</td>
<td class="periods-col">${lecture.periods.join('<br>')}</td>
<td class="category-col">${lecture.shortenedCategoryname}</td>
<td class="title-col">${lecture.titleJp}</td>
<td class="lecturer-col">${lecture.lecturerJp}</td>
<td class="evaluation-col">${lecture.shortenedEvaluationMethod}</td>
<td class="credits-col">${lecture.credits}</td>
`);
  tr.id = `tr${lecture.code}`;
  lecture.tableRow = tr;

  // 行(登録ボタン除く)をクリックしたときに詳細が表示されるようにする
  tr.addEventListener('click', () => {
    location.hash = location.hash === `#/detail/${lecture.code}`
                  ? "/top"
                  : `/detail/${lecture.code}`;
  });

  // 行に要素として追加
  tr.appendChild(generateRegisterButton(lecture));

  return tr;
}

// 講義テーブル用の登録ボタンを生成する
function generateRegisterButton(lecture) {
  const tdOfButton = document.createElement("td");
  tdOfButton.className = "registration-col";

  // バブリング防止(これがないと登録ボタンクリックで詳細が開いてしまう)
  tdOfButton.addEventListener('click', ev => {
    ev.stopPropagation();
  });

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  const label = document.createElement("label");
  label.className = 'register-button';

  const checkboxId = `checkbox-${lecture.code}`;
  checkbox.id = checkboxId;
  label.htmlFor = checkboxId;

  checkbox.onchange = () => {
    if (getLectureCodeFromHash() === lecture.code) {
      document.getElementById("checkbox-detail").checked = checkbox.checked;
    }
    if (checkbox.checked) {
      registerLecture(lecture);
    } else {
      unregisterLecture(lecture);
    }
    updateCalendarAndCreditsCount(lecture.periodsEn);
  };

  tdOfButton.append(checkbox, label);

  return tdOfButton;
}

// 講義情報のリストを受け取り、テーブルを生成・表示する
const lectureTableElement = document.getElementById('search-result');
let [lectureTableHeader, lectureTableBody] = lectureTableElement.children;

function setLectureTableHeader() {
  const newTableHeader = generateLectureTableHeader();
  lectureTableElement.replaceChild(newTableHeader, lectureTableHeader);
  lectureTableHeader = newTableHeader;
}

let periodsFilter = [];

async function initLectureTableBody() {
  const newTableBody = document.createElement("tbody");
  (await allLectureDB).forEach(lecture => {
    newTableBody.appendChild(generateLectureTableRow(lecture));
  });
  lectureTableElement.replaceChild(newTableBody, lectureTableBody);
  lectureTableBody = newTableBody;
}

async function updateLectureTableBody(showRegistered) {
  const currentFilter = showRegistered
                      ? isLectureRegistered
                      : void(showRegisteredLecturesButton.checked = false) || lectureFilter;
  periodsFilter = periodsFilter.sort(
    (a, b) => dayOrder.get(a) - dayOrder.get(b)
  );
  for (const tr of lectureTableBody.children) {
    tr.hidden = true;
  }
  const displayedLectures = (await referenceLectureDB).filter(currentFilter)
  for (const lecture of displayedLectures) {
    lecture.tableRow.hidden = false;
  }
  console.log(`showing ${displayedLectures.length} lectures from ${
    periodsFilter.length ? periodsFilter : 'all periods'
  }`);
  searchStatus.textContent = `${
      showRegistered ? "登録中"
    : periodsFilter.length ? periodsFilter
    : "全曜限"
  }の授業を表示しています`;
}

function updateLectureTable(showRegistered) {
  setLectureTableHeader();
  updateLectureTableBody(showRegistered);
}

function initLectureTable() {
  initLectureTableBody();
  updateLectureTable();
}

function lectureFilter(lecture) {
  const evaluationCondition = Object.entries(searchConditionMaster.evaluation);
  const categoryCondition = Object.entries(searchConditionMaster.category);
  const semesterCondition = Object.entries(searchConditionMaster.semester);
  const registrationCondition = Object.entries(searchConditionMaster.registration);
  const skipEvaluationMust = evaluationCondition.every(([k, v]) => v !== 'must');
  const skipEvaluationReject = evaluationCondition.every(([k, v]) => v !== 'reject');
  const skipCategory = categoryCondition.every(([k, v]) => !v)
                    || categoryCondition.every(([k, v]) => v);
  const skipSemester = semesterCondition.every(([k, v]) => !v)
                    || semesterCondition.every(([k, v]) => v);
  const skipRegistration = registrationCondition.every(([k, v]) => !v)
                        || registrationCondition.every(([k, v]) => v);
  return (
    skipCategory ||
    categoryCondition.some(([k, v]) => 
      v && (lecture.shortenedCategoryname === conditionNameTable[k])
    )
  ) &&
  (
    (
      skipEvaluationMust ||
      evaluationCondition.some(([k, v]) => 
        v === 'must' && lecture.shortenedEvaluationMethod.includes(conditionNameTable[k])
      )
    ) &&
    (
      skipEvaluationReject ||
      !(evaluationCondition.some(([k, v]) => 
        v === 'reject' && lecture.shortenedEvaluationMethod.includes(conditionNameTable[k])
      ))
    )
  ) &&
  (
    skipRegistration ||
    registrationCondition.some(([k, v]) => 
      v && (isLectureRegistered(lecture) === (conditionNameTable[k] === '登録済'))
    )
  ) &&
  (
    skipSemester ||
    semesterCondition.some(([k, v]) => 
      v && (lecture.semester === conditionNameTable[k])
    )
  ) &&
  (
    !(periodsFilter.length) ||
    // 基礎生命科学実験αが"集中6"なのでその対応
    lecture.periods.some(
      targetP => periodsFilter.some(referenceP => targetP.includes(referenceP))
    )
  )
}

// 全講義データの生成
const weekNameJpToEn = {
  '月': 'monday',
  '火': 'tuesday',
  '水': 'wednesday',
  '木': 'thursday',
  '金': 'friday',
};
const allLectureDB = (async () => {
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
      /出席|出欠|(A|a)ttendance/.test(text) ? "出席" : "",
      /平常点|小テスト|参加|(P|p)articipation/.test(text) ? "平常" : "",
    ].join("");
  }

  const allClassListUrl = './classList/data-beautified2023.json';
  const response = await fetch(allClassListUrl);
  const allLectureList = await response.json();
  for (const lecture of allLectureList) {
    lecture.semester = normalizeText(lecture.semester);
    lecture.titleJp = normalizeText(lecture.titleJp);
    lecture.lecturerJp = normalizeText(lecture.lecturerJp);
    lecture.detail = normalizeText(lecture.detail);
    // 週間表のidを英語名にしているため、英語名を作っておく
    lecture.periodsEn = lecture.periods.map(periodsJp => {
      if (periodsJp.includes("集中")) {
        return "intensive0"
      }
      const weekNameJp = periodsJp.charAt(0);
      const time = periodsJp.charAt(1);
      return weekNameJpToEn[weekNameJp] + time;
    });
    lecture.shortenedCategoryname = lecture.type + getShortenedCategoryName(lecture.category);
    lecture.shortenedEvaluationMethod = getShortenedEvaluationMethod(lecture.evaluation);
    if (lecture.shortenedEvaluationMethod === "試験レポ出席平常") {
      lecture.shortenedEvaluationMethod = "試験レポ<br>出席平常";
    }
  }
  console.log(allLectureList);
  return allLectureList;
})();
let referenceLectureDB = allLectureDB;


const weekNameEnToJp = {
  'monday': '月',
  'tuesday': '火',
  'wednesday': '水',
  'thursday': '木',
  'friday': '金',
};

const searchStatus = document.getElementById("search-status");

// カレンダー生成(calendarCellMasterで管理)
const calendarCellMaster = new Map();
// カレンダーのマス
const dayOrder = new Map();
class CalendarCell {
  constructor(week, time) {
    // week: 曜日名英語小文字
    // time: 時限名整数
    this.id = `${week}${time}`;
    this.idJp = week in weekNameEnToJp
              ? `${weekNameEnToJp[week]}${time}`
              : "集中"; // 月1, 火2, 集中 など
    dayOrder.set(this.idJp, dayOrder.size);
    this.registeredLectureNames = new Set();

    this.element = document.getElementById(this.id);
    // ここでdataset.defaultに入れた値をCSSで取り出して::afterで表示している
    this.element.dataset.default = `${this.idJp}検索`;
    this.element.addEventListener('click', () => {
      if (!(periodsFilter.includes(this.idJp))) {
        periodsFilter.push(this.idJp);
      } else {
        periodsFilter = periodsFilter.filter(v => v !== this.idJp);
      }
      updateLectureTableBody();
    });
    calendarCellMaster.set(this.id, this);
  }

  // 講義をカレンダーに書き込む
  writeInCalendar() {
    // リセットしてから
    this.registeredLectureNames.clear();
    // 曜限が同じ && 同名の授業がない場合に授業を追加する
    registeredLectures.forEach(
      lecture => {
        if (
          lecture.periods.includes(this.idJp)
          && !this.registeredLectureNames.has(lecture.titleJp)
        ) {
          this.registeredLectureNames.add(lecture.titleJp);
          console.log(`${this.idJp} -> ${lecture.titleJp}`);
        }
      }
    )
    this.element.innerText = [...this.registeredLectureNames].join("\n");
  }
}

for (const day in weekNameEnToJp) {
  for (let i = 1; i <= 6; i++) {
    new CalendarCell(day, i);
  }
}
new CalendarCell("intensive", 0);

// カレンダーの対応するセルを更新する
// (引数はperiodsEn形式)
function updateCalendar(periodsEn){
  if (periodsEn) {
    periodsEn.forEach(
      period => calendarCellMaster.get(period).writeInCalendar()
    );
  } else {
    calendarCellMaster.forEach(cell => cell.writeInCalendar())
  }
}

// 指定曜限の表示(カレンダー/それを元に単位数も)を更新する。指定のない場合は全曜限を更新する
function updateCalendarAndCreditsCount(periodsEn){
  updateCalendar(periodsEn);
  updateCreditsCount();
}

// アクティブウィンドウ切り替え
const windowMap = {
  askiiArt: document.getElementById("aa-window"),
  status: document.getElementById("status-window"),
  search: document.getElementById("search-panel"),
  settings: document.getElementById("settings-window"),
};
function getActiveWindowName() {
  for (const rWindowName in windowMap) {
    if (!(windowMap[rWindowName].hidden)) {
      return rWindowName;
    }
  }
  return null;
}
function changeActiveWindow(windowName) {
  console.log(`activate ${windowName ?? "home"} window`);
  for (const rWindowName in windowMap) {
    windowMap[rWindowName].hidden = windowName !== rWindowName;
  }
}

// AA表示
const askiiArtDB = Promise.all([
  "./classList/error1.txt",
  "./classList/error2.txt",
].map(async url => (await fetch(url)).text()));
const askiiArtBox = document.getElementById("askii-art");
async function showAskiiArt() {
  const numberOfAskiiArts = 2;
  const randomNumber = Math.floor(Math.random() * (numberOfAskiiArts));
  askiiArtBox.textContent = "";
  askiiArtBox.insertAdjacentHTML('afterbegin', (await askiiArtDB)[randomNumber]);
  changeActiveWindow("askiiArt");
  // document.write("少し、頭冷やそうか。");
  // document.write("おイタしちゃだめにょろよ。");
}

// Promise([1年必修の一覧, 2年必修の一覧])
const compulsoryDB = Promise.all([
  "./classList/requiredLecture2023.json",
  "./classList/requiredLecture2023_2.json",
].map(async url => (await fetch(url)).json()));

const classNumberBox = document.getElementById("class-number");
classNumberBox.addEventListener('keydown', ev => {
  if (ev.key === "Enter") {
    autofillCompulsoryButton.click();
    ev.preventDefault();
  }
});
function getPersonalStatus() {
  return {
    stream: document.getElementById("select-karui").value,
    classNumber: classNumberBox.value,
    grade: document.getElementById("grade").value,
  };
}

let classregisterableLectureDB;
const availableOnlyCheck = document.getElementById("available-only");
async function setReferenceDatabase() {
  referenceLectureDB = await (
      availableOnlyCheck.checked
    ? classregisterableLectureDB
    : allLectureDB
  );
  updateLectureTableBody();
}
availableOnlyCheck.addEventListener('click', setReferenceDatabase);

// 所属クラスから必修の授業を自動で登録するメソッド
async function validateStatusAndTransitWindow(registerCompulsory) {
  function streamFilter(lecture) {
    const {stream, classNumber, grade} = getPersonalStatus();
    return lecture[grade === "first" ? "one_grade" : "two_grade"].some(
      classID => (classID === `${stream}_${classNumber}`)
              || (classID === `${stream}_all`)
    );
  }

  // クラス -> データベースの参照の更新
  classregisterableLectureDB = (await allLectureDB).filter(streamFilter);
  setReferenceDatabase();

  const {stream, classNumber, grade} = getPersonalStatus();
  // 一旦登録授業をすべてリセット
  // その際に、登録されていた授業の「削除」ボタンをすべてクリックして戻す
  for (const lecture of registeredLectures.values()) {
    const button = document.getElementById(`checkbox-${lecture.code}`);
    if (button) {
      button.checked = false;
    }
  }
  clearRegisteredLectures();

  const appliedCompulsoryDB = (await compulsoryDB)[(grade === "first") ? 0 : 1];
  const classId = `${stream}_${classNumber}`;
  if (classId in appliedCompulsoryDB) {
    if (registerCompulsory) {
      const requiredLectureCodeList = appliedCompulsoryDB[classId];
      for (const lecture of (await referenceLectureDB).filter(
        l => requiredLectureCodeList.includes(l.code)
      )) {
        registerLecture(lecture);
        // 講義テーブルの登録ボタンの表示を実態に合わせる
        const button = document.getElementById(`checkbox-${lecture.code}`);
        if (button) {
          button.checked = true;
        }
      }
      updateCalendarAndCreditsCount();
      console.log("必修授業一覧:");
      console.log(registeredLectures);
    }
    changeActiveWindow();
  } else {
    showAskiiArt();
  }
}

// 登録授業一覧ボタン
const showRegisteredLecturesButton = document.getElementById("registered-lecture");
showRegisteredLecturesButton.addEventListener('click', () => {
  updateLectureTable(showRegisteredLecturesButton.checked);
});

// 曜限リセットボタン
const resetPeriodButton = document.getElementById("all-period");
resetPeriodButton.addEventListener('click', () => {
  periodsFilter = [];
  updateLectureTableBody();
});

// 曜限以外リセットボタン
const resetConditionButton = document.getElementById("reset-condition");
resetConditionButton.addEventListener('click', () => {
  resetSearchCondition();
  updateLectureTable();
});

// 各曜日に検索機能を設定
Object.entries(weekNameEnToJp).forEach(([dayEn, dayJp]) => {
  const dayHeader = document.getElementById(dayEn);
  const dayList = [...Array(6)].map((_, i) => dayJp + (i + 1).toString());
  dayHeader.addEventListener('click', () => {
    periodsFilter = dayList;
    updateLectureTable();
  });
});
document.getElementById("intensive").addEventListener(
  'click', calendarCellMaster.get("intensive0").element.onclick
);

function getLectureCodeFromHash() {
  return location.hash.match(/^#\/detail\/(\d+)$/)?.[1];
}

// ここで講義詳細の表示を変えている
const detailWindow = document.getElementById("detail-window");
window.onhashchange = async () => {
  const targetLectureCode = getLectureCodeFromHash();
  detailWindow.textContent = "";
  detailWindow.scrollTo(0, 0);
  if (targetLectureCode) {
    const lecture = (await allLectureDB).find(
      l => l.code === targetLectureCode
    );
    console.log("showing detail of:");
    console.log(lecture);
    if (lecture) {
      const detailContent = document.createElement("div");
      const detailHeader = document.createElement("header");
      detailHeader.id = "detail-header";
      detailContent.id = "detail-content";
      detailHeader.insertAdjacentHTML(
        'beforeend',
        `
<div id="detail-title"><strong id="lecture-title">${lecture.titleJp}</strong> taught by ${lecture.lecturerJp}</div>
`
      );
      detailContent.insertAdjacentHTML(
        'beforeend',
        `
<p>${lecture.type + "科目 " + lecture.category}</p>
<p class="section">開講学期</p>
<p>${lecture.semester}</p>
<p class="section">対象クラス</p>
<p>${lecture.class}</p>
<p class="section">単位数</p>
<p>${lecture.credits}</p>
<p class="section">実施場所</p>
<p>${lecture.classroom}</p>
<p class="section">曜限</p>
<p>${lecture.periods}</p>
<p class="section">詳細</p>
<p>${lecture.detail}</p>
<p class="section">講義計画</p>
<p>${lecture.schedule}</p>
<p class="section">講義方法</p>
<p>${lecture.methods}</p>
<p class="section">評価</p>
<p>${lecture.evaluation}</p>
<p class="section">注意</p>
<p>${lecture.notes}</p>
`
      );
      detailHeader.appendChild(generateRegisterButtonFromDetail(lecture.code));
      detailHeader.appendChild(generateRemoveDetailButton());
      detailWindow.append(detailHeader, detailContent);
    }
  }
};

function generateRemoveDetailButton() {
  const removeDetailButton = document.createElement("button");
  removeDetailButton.addEventListener('click', () => {location.hash = "/top";});
  removeDetailButton.textContent = "✕";
  removeDetailButton.id = "remove-detail";
  return removeDetailButton;
}

function generateRegisterButtonFromDetail(code) {
  const divOfButton = document.createElement("div");
  divOfButton.className = "registration-col";

  // バブリング防止(これがないと登録ボタンクリックで詳細が開いてしまう)
  divOfButton.addEventListener('click', ev => {
    ev.stopPropagation();
  });

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.hidden = true;
  const label = document.createElement("label");
  label.className = 'register-button';

  const checkboxId = `checkbox-${code}`;
  checkbox.id = "checkbox-detail";
  label.htmlFor = checkboxId;

  divOfButton.append(checkbox, label);

  return divOfButton;
}

// ウィンドウ切り替え関連ボタン
const autofillCompulsoryButton = document.getElementById("autofill-compulsory");
autofillCompulsoryButton.addEventListener('click', () => {
  validateStatusAndTransitWindow(true);
});
const closeStatusButton = document.getElementById("close-status");
closeStatusButton.addEventListener('click', () => {
  validateStatusAndTransitWindow(false);
});

const deleteAAButton = document.getElementById("delete-aa");
const openStatusButton = document.getElementById("open-status");
openStatusButton.onclick = deleteAAButton.onclick = () => {
  changeActiveWindow("status");
};
const searchButton = document.getElementById("search-button");
searchButton.addEventListener('click', () => {
  changeActiveWindow(getActiveWindowName() === "search" ? "" : "search");
});
const settingsButton = document.getElementById("settings");
settingsButton.addEventListener('click', () => {
  changeActiveWindow(getActiveWindowName() === "settings" ? "" : "settings");
});

const calendarWindow = document.getElementById("calendar-window");
const changeCalendarDisplayButton = document.getElementById("change-calendar-display");
changeCalendarDisplayButton.addEventListener('click', () => {
  calendarWindow.classList.toggle("fullscreen-window");
});

// デフォルトの表示として、全講義をテーブルに載せる
initLectureTable();
// hashに応じた講義詳細を表示
window.onhashchange();
