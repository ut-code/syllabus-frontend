"use strict";

// TODO: 可能であればS1/S2をカレンダー上で区別できると嬉しい(でもどうやって?)
// TODO: 何個もある必修の同名授業をsquashする機能 -> データベースに手を加える必要がある
// TODO: search.periods(に限らず曜限)を数字で管理する?
// TODO: 各種ボタンを適切なモジュールのinitに割り振る

// 取得した講義データの要素(一例)
// {
//   "code": "31357",
//   "type": "総合",
//   "category": "Ｅ（物質・生命）",
//   "semester": "S1",
//   "periods": [
//     "月3",
//     "木3"
//   ],
//   "classroom": "駒場11号館 1101教室",
//   "titleJp": "物性化学",
//   "lecturerJp": "吉本 敬太郎",
//   "titleEn": "Basics in Material Chemistry",
//   "lecturerEn": "YOSHIMOTO Keitaro",
//   "ccCode": "CAS-FC1888L1",
//   "credits": "2.0",
//   "detail": "物質の多様な構造、性質および反応を理解するための、基礎的な化学の概念、理論を具体的な化合物を例にして学ぶ。以下の項目とその関連事項を内容とするが、教員により順序や重点の置き方に少し違いがある場合もある。\n\n１．多原子分子の構造ルイス構造と分子構造、共有結合の方向性、混成軌道\n２．パイ結合の化合物共役二重結合、共鳴、ベンゼン、芳香族化合物\n３．パイ電子と分子軌道パイ電子近似、LCAOMO、変分法、HOMOとLUMO\n４．配位結合の化合物Lewis酸・塩基、金属錯体と配位結合、遷移金属錯体とd軌道、結晶場 分裂\n５．分子間相互作用と凝集系、生体高分子化学van der Waals力、水素結合\n６．結晶の構造と結合最密充填、単純格子、イオン半径と結晶構造、金属と半導体\n７．イオン結晶格子エネルギー、Madelung定数、Born-Haberサイクル",
//   "schedule": "授業の目標、概要を参照ください。「化学の基礎７７講」をベースに、古典的分子軌道論、配位化学、生体高分子化学、分析化学などのトピックも盛り込む予定です。",
//   "methods": "105分授業の代わりに90分で講義する。補填として、授業開始時または授業後に15分程度質疑応答の時間を設け、数回の演習問題（宿題形式・回答を提出してもらう）を実施する予定です。\n\n板書（黒板、またはプロジェクター・PCを用いて行う予定）の講義形式を予定。適宜、スライド、プリントを用いて行う。",
//   "evaluation": "試験結果と提出物の状況等を総合し、評価を行う。",
//   "notes": "講義の形態や成績評価法は、教養学部の方針に従って随時指示する。",
//   "class": "2年 文科",
//   "one_grade": [],
//   "two_grade": [
//     "l1_all",
//     "l2_all",
//     "l3_all"
//   ],
//   - 以下は追加した属性
//   "periodsEn": [
//     "monday3",
//     "thursday3"
//   ],
//   "shortenedCategory": "総合E",
//   "shortenedEvaluation": "試験レポ",
//   "tableRow": (省略)
// }

const lastUpdated = "2023S";

// moduleLike: ベンチマーク測定
const benchmark = {
  init() {
    console.log("* measure initializing time *");
    this.initTime = Date.now();
  },
  initTime: undefined,
  log(message) {
    console.log(message);
    console.log(Date.now() - this.initTime);
  },
};
benchmark.init();

// pythonのCounterを再現
class Counter extends Map {
  get(key) {
    return super.get(key) ?? 0;
  }

  increment(key) {
    this.set(key, this.get(key) + 1);
  }
  
  decrement(key) {
    const dec = this.get(key) - 1;
    dec === 0 ? this.delete(key) : this.set(key, dec);
  }
}

// moduleLike: localStorage
// 所属(科類, 学年, クラス)(personalStatus)
// -> getPersonalStatus
// 検索条件(condition, periods)
// -> updateLectureTableBodyBySearchQuery
// 登録授業(コード[])(registeredLectures)
// -> registerLecture, unregisterLecture, clearRegisteredLectures
// 非スカラー値は保存が少々手間なので予めラッパーを作っておく
const storageAccess = {
  get setItem() {
    return (key, value) => localStorage.setItem(key, JSON.stringify(value));
  },
  get getItem() {
    return key => JSON.parse(localStorage.getItem(key));
  },
  get clear() {
    return () => localStorage.clear();
  },
};

// moduleLike: 登録授業
// TODO: registered...の更新とカレンダーの更新をまとめる
// TODO: 厳密に言うならば同一曜限の授業もカウントできないがその対応はまた今度
const registration = {
  lectureMap: new Map(),
  // 単位計算＆表示用の名前ごとのカウンタ
  lectureNameCounter: new Counter(),
  get lectureIter() {return this.lectureMap.values();},
  getCounterName(lecture) {return `${lecture.titleJp}--${lecture.credits}`;},
  // 授業が登録されているか
  has(lecture) {return this.lectureMap.has(lecture.code);},
  // 同じ授業が登録されていないなら、登録リストに授業を入れる
  add(lecture) {
    if (this.has(lecture)){
      return;
    }
    this.lectureMap.set(lecture.code, lecture);
    this.save();
    // 以下、単位数計算用
    if (this.lectureNameCounter.has(this.getCounterName(lecture))) {
      this.lectureNameCounter.increment(this.getCounterName(lecture));
      return;
    }
    this.lectureNameCounter.increment(this.getCounterName(lecture));
  },
  // 登録リストから授業を削除する
  delete(lecture) {
    this.lectureMap.delete(lecture.code);
    this.lectureNameCounter.decrement(this.getCounterName(lecture))
    this.save();
  },
  // 登録リストを初期化する
  clear() {
    // TODO: ここでテーブルの再生成をしたいので、searchの曜限をCalendarCellから解放したい
    // 登録されていた授業の「削除」ボタンをすべてクリックして戻す
    for (const lecture of this.lectureMap.values()) {
      const button = lecture.tableRow.lastElementChild.childNodes[0];
      if (button) {
        // click()にしていないのは再描画の繰り返しを避けるため
        button.checked = false;
      }
    }
    this.lectureMap.clear();
    this.lectureNameCounter.clear();
    this.save();
  },
  // 登録ボタン以外から複数授業を登録する
  async setByFilter(lectureFilter, isSpecified) {
    const lectureList = (
      await lectureDB[isSpecified ? 'specified' : 'whole']
    ).filter(lectureFilter);
    for (const lecture of lectureList) {
      this.add(lecture);
      // 講義テーブルの登録ボタンの表示を実態に合わせる
      const button = lecture.tableRow.lastElementChild.childNodes[0];
      if (button) {
        // click()にしていないのは再描画の繰り返しを避けるため
        button.checked = true;
      }
    }
    console.log("登録授業一覧:");
    console.log(this.lectureMap);
  },
  save() {
    storageAccess.setItem("registeredCodes", [...this.lectureMap.keys()]);
  },
  load() {
    const registeredCodes = new Set(storageAccess.getItem("registeredCodes"));
    if (registeredCodes.size) {
      this.setByFilter(lecture => registeredCodes.has(lecture.code), false);
    }
  },
  // TODO: 可能性: 所管移動
  creditCounter: document.getElementById('credit-counter'),
  // 単位数を計算し、表示に反映させる
  updateCreditsCount() {
    this.creditCounter.textContent = [...this.lectureNameCounter.keys()].reduce(
      (acc, lectureName) => acc + Number(lectureName.split("--")[1]), 0
    );
  }
};

// moduleLike: 検索機能

// 追加したい検索フィルタ
// フリーワード

// フリーワード検索時にかけるフィルタ
// lecture.semester.toLowerCase();
// lecture.titleJp.toLowerCase();
// lecture.lecturerJp.toLowerCase();
// lecture.detail.toLowerCase();
const search = {
  init() {this.condition = this.getPreset()},
  condition: Object.create(null),
  // 検索対象の曜限をidJpの形式で保持
  periods: [],
  nameTable: {
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
    credits: '単位',
  },
  getPreset: () => ({
    semester: new Map(lastUpdated.endsWith('S') ? [
      ['S_', true],
      ['S1', true],
      ['S2', true],
    ] : [
      ['A_', true],
      ['A1', true],
      ['A2', true],
    ]),
    evaluation: new Map([
      ['exam', 'ignore'],
      ['paper', 'ignore'],
      ['attendance', 'ignore'],
      ['participation', 'ignore'],
    ]),
    category: new Map([
      ['foundation', false],
      ['requirement', false],
      ['thematic', false],
      ['intermediate', false],
      ['L', false],
      ['A', true],
      ['B', true],
      ['C', true],
      ['D', true],
      ['E', true],
      ['F', true],
    ]),
    registration: new Map([
      ['unregistered', true],
      ['registered', true],
    ]),
  }),
  set(condition) {
    for (const [key, value] of Object.entries(condition)) {
      switch (value?.constructor?.name) {
        case 'Map':
          search.condition[key] = new Map(value.entries());
          break;
        case 'Array':
          search.condition[key] = new Map(value);
          break;
        default:
          throw new Error(`cannot cast: ${value}`);
      }
    }
  },
  reset() {this.set(this.getPreset());},
  convertToSave: condition => {
    const searchConditionForSave = {};
    for (const [key, value] of Object.entries(condition)) {
      searchConditionForSave[key] = [...value.entries()];
    }
    return searchConditionForSave;
  },
  queryFilter(lecture) {
    const condition = this.condition;
    const nameTable = this.nameTable;
    const periods = this.periods;
    const evaluationCondition = [...condition.evaluation.entries()];
    const categoryCondition = [...condition.category.entries()];
    const semesterCondition = [...condition.semester.entries()];
    const registrationCondition = [...condition.registration.entries()];
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
        v && (lecture.shortenedCategory === nameTable[k])
      )
    ) &&
    (
      (
        skipEvaluationMust ||
        evaluationCondition.some(([k, v]) => 
          v === 'must' && lecture.shortenedEvaluation.includes(nameTable[k])
        )
      ) &&
      (
        skipEvaluationReject ||
        !(evaluationCondition.some(([k, v]) => 
          v === 'reject' && lecture.shortenedEvaluation.includes(nameTable[k])
        ))
      )
    ) &&
    (
      skipRegistration ||
      registrationCondition.some(([k, v]) => 
        v && (registration.has(lecture) === (nameTable[k] === '登録済'))
      )
    ) &&
    (
      skipSemester ||
      semesterCondition.some(([k, v]) => 
        v && (lecture.semester === nameTable[k])
      )
    ) &&
    (
      !(periods.length) ||
      // 基礎生命科学実験αが"集中6"なのでその対応
      lecture.periods.some(
        targetP => periods.some(referenceP => targetP.includes(referenceP))
      )
    )
  },
  save() {
    storageAccess.setItem("condition", this.convertToSave(this.condition));
    storageAccess.setItem("periods", this.periods);
  },
  load() {
    const conditionRestored = storageAccess.getItem("condition");
    if (conditionRestored) {
      search.set(conditionRestored);
    }
    const periodsRestored = storageAccess.getItem("periods");
    if (periodsRestored) {
      search.periods = periodsRestored;
      return true;
    }
    return Boolean(conditionRestored);
  },
  statusBox: document.getElementById("search-status"),
  showStatus(message) {this.statusBox.textContent = message;},
};
search.init();


// ここからテーブル生成

function generateBinaryButtonForHeader(category, name, isHalf = false) {
  // 以下、登録/削除ボタン(checkboxを活用)の生成
  const checkbox = document.createElement("input");
  const label = document.createElement("label");
  checkbox.type = "checkbox";
  checkbox.name = `${category}-${name}`;
  label.className = "header-binary-button";
  label.tabIndex = 0;
  label.role = "button";

  if (search.condition[category].get(name)) {
    checkbox.checked = true;
  }

  // labelがcheckboxを参照できるよう、ユニークなIDを生成
  const checkboxId = `checkbox-${category}-${name}`;
  checkbox.id = checkboxId;
  label.htmlFor = checkboxId;
  label.textContent = search.nameTable[name];

  checkbox.addEventListener('change', () => {
    search.condition[category].set(name, checkbox.checked);
    console.log(`${category}-${name} -> ${checkbox.checked}`);
    updateLectureTableBodyBySearchQuery();
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

    if (reaction === search.condition[category].get(name)) {
      radio.checked = true;
    }

    // labelがcheckboxを参照できるよう、ユニークなIDを生成
    const radioId = `${category}-${name}-${reaction}`;
    radio.id = radioId;
    label.htmlFor = radioId;
    label.textContent = search.nameTable[name];

    radio.addEventListener('change', () => {
      search.condition[category].set(name, reaction);
      console.log(`${category}-${name} -> ${reaction}`);
      updateLectureTableBodyBySearchQuery();
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
  summary.textContent = search.nameTable[headName];
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
    if (headName in search.condition) {
      th = pullDownMenuMaker(
        headName,
        [...search.condition[headName].keys()],
        headName === 'evaluation',
      );
    } else {
      th = document.createElement("th");
      th.textContent = search.nameTable[headName];
    }
    th.classList.add([`${headName}-col`]);
    tr.append(th);
  }
  thead.append(tr);
  return thead;
}

// ここまでthead, ここからtbody

// 講義情報からテーブルの行(ボタン含む)を生成する
function generateLectureTableRow(lecture) {
  const tr = document.createElement("tr");
  tr.insertAdjacentHTML('afterbegin', `
<td class="semester-col">${lecture.semester}</td>
<td class="periods-col">${lecture.periods.join('<br>')}</td>
<td class="category-col">${lecture.shortenedCategory}</td>
<td class="title-col">${lecture.titleJp}</td>
<td class="lecturer-col">${lecture.lecturerJp}</td>
<td class="evaluation-col">${lecture.shortenedEvaluation}</td>
<td class="credits-col">${lecture.credits}</td>
`);
  tr.id = `tr${lecture.code}`;
  lecture.tableRow = tr;

  // 行(登録ボタン除く)をクリックしたときに詳細が表示されるようにする
  tr.addEventListener('click', () => {
    detailHash.code = detailHash.code !== lecture.code ? lecture.code : null;
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
    if (detailHash.code === lecture.code) {
      detailViews.checkbox.checked = checkbox.checked;
    }
    if (checkbox.checked) {
      registration.add(lecture);
    } else {
      registration.delete(lecture);
    }
    updateCalendarAndCreditsCount(lecture.periods);
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

async function initLectureTableBody() {
  benchmark.log("* table init start *");

  lectureTableElement.hidden = true;
  (await lectureDB.whole).forEach(lecture => {
    lectureTableBody.appendChild(generateLectureTableRow(lecture));
  });
  lectureTableElement.hidden = false;

  benchmark.log("* table init end *");
}

async function updateLectureTableBodyBySearchQuery(showRegistered) {
  if (!(showRegistered)) {
    // 登録授業表示を解除
    showRegisteredLecturesButton.checked = false
    // 曜限の表示をソート
    search.periods = search.periods.sort(
      (a, b) => calendar.dayOrder.get(a) - calendar.dayOrder.get(b)
    );
  }
  const appliedFilter = showRegistered
                      ? lecture => registration.has(lecture)
                      : lecture => search.queryFilter(lecture);
  // 表示すべき行のみ表示する
  for (const tr of lectureTableBody.children) {
    tr.hidden = true;
  }
  const lecturesToDisplay = (await lectureDB.reference).filter(appliedFilter)
  for (const lecture of lecturesToDisplay) {
    lecture.tableRow.hidden = false;
  }
  // 現在の状態を標示する
  console.log(`showing ${lecturesToDisplay.length} lectures from ${
    search.periods.length ? search.periods : 'all periods'
  }`);
  search.showStatus(`${
      showRegistered ? "登録中"
    : search.periods.length ? search.periods
    : "全曜限"
  }の授業を表示しています`);
  // 永続化
  search.save();
}

function updateLectureTable(showRegistered) {
  setLectureTableHeader();
  updateLectureTableBodyBySearchQuery(showRegistered);
}


// moduleLike: データベース
const lectureDB = {
  init() {
    this.availableCheck.addEventListener('click', () => updateLectureTableBodyBySearchQuery());
  },
  whole: (async () => {
    // 以下、前のシステムのコードを借りました
  
    // テキストの全角英数字, 全角スペース, 空文字を除去する
    // 小文字にはしないので検索時は別途toLowerCase()すること
    const normalizeText = text => {
      return text.trim().replace(/[\s　]+/g, " ").replace(
        /[Ａ-Ｚａ-ｚ０-９]/g,
        s => String.fromCharCode(s.charCodeAt(0) - 65248)
      );
    };
    // 系列の短縮表現を得る
    const getShortenedCategory = category => {
      switch (category) {
        case "Ｌ（言語・コミュニケーション）": return "L";
        case "Ａ（思想・芸術）": return "A";
        case "Ｂ（国際・地域）": return "B";
        case "Ｃ（社会・制度）": return "C";
        case "Ｄ（人間・環境）": return "D";
        case "Ｅ（物質・生命）": return "E";
        case "Ｆ（数理・情報）": return "F";
        default: return "";
      }
    };
    // 評価方法の短縮表現を得る
    const getShortenedEvaluation = text => {
      if (!text) {return "不明";}
      return [
        /試験|(期末|中間)テスト|(E|e)xam/.test(text) ? "試験" : "",
        /レポート|提出|課題|宿題|(A|a)ssignments|(R|r)eport|(H|h)omework|(P|p)aper/.test(text) ? "レポ" : "",
        /出席|出欠|(A|a)ttendance|参加|(P|p)articipation/.test(text) ? "出席" : "",
        /平常点|小テスト|参加|(P|p)articipation/.test(text) ? "平常" : "",
      ].join("");
    };
    const processLecture = lecture => {
      lecture.titleJp = normalizeText(lecture.titleJp);
      lecture.titleEn = normalizeText(lecture.titleEn);
      lecture.lecturerJp = normalizeText(lecture.lecturerJp);
      lecture.lecturerEn = normalizeText(lecture.lecturerEn);
      lecture.ccCode = normalizeText(lecture.ccCode);
      lecture.semester = normalizeText(lecture.semester);
      lecture.credits = normalizeText(lecture.credits);
      lecture.classroom = normalizeText(lecture.classroom);
      lecture.shortenedCategory = lecture.type + getShortenedCategory(lecture.category);
      lecture.shortenedEvaluation = getShortenedEvaluation(lecture.evaluation);
      if (lecture.shortenedEvaluation === "試験レポ出席平常") {
        lecture.shortenedEvaluation = "試験レポ<br>出席平常";
      }
    };
  
    benchmark.log("* DB init start *");
    
    const allClassListUrl = './classList/data-beautified2023.json';
    const response = await fetch(allClassListUrl);
    benchmark.log("* DB init fetch *");
    const allLectureList = await response.json();
    benchmark.log("* DB init json-ize *");
    allLectureList.forEach(processLecture);

    benchmark.log("* DB init end *");

    return allLectureList;
  })(),
  get reference() {
    return this.availableCheck.checked ? this.specified : this.whole
  },
  specified: undefined,
  availableCheck: document.getElementById("available-only"),
  async setSpecificator(filter) {
    this.specified = (await this.whole).filter(filter);
  }
};
lectureDB.init();


// moduleLike: アクティブウィンドウ切り替え
const innerWindow = {
  index: new Map([
    ["askiiArt", document.getElementById("aa-window")],
    ["status", document.getElementById("status-window")],
    ["search", document.getElementById("search-panel")],
    ["settings", document.getElementById("settings-window")],
  ]),
  get activeWindowName() {
    for (const [targetWindowName, targetWindow] of this.index.entries()) {
      if (!(targetWindow.hidden)) {
        return targetWindowName;
      };
    }
    return undefined;
  },
  changeTo(windowName) {
    for (const [targetWindowName, targetWindow] of this.index.entries()) {
      targetWindow.hidden = windowName !== targetWindowName;
    }
    console.log(`activate ${windowName ?? "home"} window`);
  },
  toggle(primaryWindowName, fallbackWindowName) {
    this.changeTo(
      this.activeWindowName !== primaryWindowName
                            ? primaryWindowName
                            : fallbackWindowName
    );
  },
};

// moduleLike: AA表示
const AA = {
  DB: Promise.all([
    "./classList/error1.txt",
    "./classList/error2.txt",
  ].map(async url => (await fetch(url)).text())),
  drawBox: document.getElementById("askii-art"),
  pattern: 2,
  async show() {
    const randomIndex = Math.floor(Math.random() * (this.pattern));
    this.drawBox.innerText = (await this.DB)[randomIndex];
    innerWindow.changeTo("askiiArt");
    // "少し、頭冷やそうか。";
    // "おイタしちゃだめにょろよ。";
  },
};

// moduleLike: 所属情報
const personal = {
  init() {
    this.classNumber.addEventListener('keydown', ev => {
      if (ev.key === "Enter") {
        validateStatusAndTransitWindow(true);
        ev.preventDefault();
      }
    })
  },
  stream: document.getElementById("compulsory"),
  grade: document.getElementById("grade"),
  classNumber: document.getElementById("class-number"),
  get() {return {
    stream: this.stream.value,
    classNumber: this.classNumber.value,
    grade: this.grade.value,
  };},
  set(personalStatus) {
    this.stream.value = personalStatus.stream;
    this.classNumber.value = personalStatus.classNumber;
    this.grade.value = personalStatus.grade;
  },
  save() {
    storageAccess.setItem("personalStatus", this.get());
  },
  load() {
    const personalStatus = storageAccess.getItem("personalStatus");
    if (personalStatus) {
      console.log(personalStatus);
      personal.set(personalStatus);
      return true;
    }
    return false;
  },
};
personal.init();

// Promise([1年必修の一覧, 2年必修の一覧])
const compulsoryDB = Promise.all([
  "./classList/requiredLecture2023.json",
  "./classList/requiredLecture2023_2.json",
].map(async url => (await fetch(url)).json()));

// 所属クラスからDB更新+必修自動登録+画面遷移
// 1. 所属の有効判定(保存)
// 2. AA更新
// 3. 参照DB更新
// 3.1. テーブル更新
// 4. 必修自動入力
// 4.1. カレンダー更新
// 5. 画面遷移
async function validateStatusAndTransitWindow(registerCompulsory) {
  // 情報を取得
  const personalStatus = personal.get();
  const {stream, classNumber, grade} = personalStatus;
  const classId = `${stream}_${classNumber}`;
  const classIdGeneral = `${stream}_all`;
  // 必修のコードの配列. 必修がない場合は空リスト(truthy), DBにインデックスがない場合はundefined(falsy)
  // JSでは空配列は真と評価されることに注意
  const requiredCodeList = (await compulsoryDB)[(grade === "one_grade") ? 0 : 1]?.[classId];

  // 有効な所属でない場合AA表示のみ
  if (!requiredCodeList) {
    AA.show();
    return;
  }

  // 有効な所属である場合に以下に進む
  // クラス -> データベースの参照の更新
  const filterByClass = lecture => lecture[grade].some(
    classID => (classID === classIdGeneral) || (classID === classId)
  );
  await lectureDB.setSpecificator(filterByClass);
  updateLectureTableBodyBySearchQuery();

  // 必修入力部分
  if (registerCompulsory) {
    // 一旦登録授業をすべてリセット
    registration.clear();
    // リストにある講義を登録
    await registration.setByFilter(lecture => requiredCodeList.includes(lecture.code), true);
  }
  updateCalendarAndCreditsCount();

  // 永続化
  personal.save();

  innerWindow.changeTo();
}

// 登録授業一覧ボタン
const showRegisteredLecturesButton = document.getElementById("registered-lecture");
showRegisteredLecturesButton.addEventListener('click', () => {
  updateLectureTable(showRegisteredLecturesButton.checked);
});
{
  // 曜限リセットボタン
  const resetPeriodButton = document.getElementById("all-period");
  resetPeriodButton.addEventListener('click', () => {
    search.periods = [];
    updateLectureTableBodyBySearchQuery();
  });

  // 曜限以外リセットボタン
  const resetConditionButton = document.getElementById("reset-condition");
  resetConditionButton.addEventListener('click', () => {
    search.reset();
    updateLectureTable();
  });
}

// moduleLike: カレンダー
// TODO: use this
const calendar = {
  init() {
    // 各曜限に検索機能を設定
    for (const dayJp in this.weekJpToEn) {
      for (let i = 1; i <= 6; i++) {
        new this.Cell(dayJp, i);
      }
    }
    // 各曜日に検索機能を設定
    Object.entries(this.weekJpToEn).forEach(([dayJp, dayEn]) => {
      const dayHeader = document.getElementById(dayEn);
      const dayList = [...Array(6)].map((_, i) => dayJp + (i + 1).toString());
      dayHeader.addEventListener('click', () => {
        search.periods = dayList;
        updateLectureTableBodyBySearchQuery();
      });
    });
    // 各時間帯に検索機能を設定
    [...Array(6)].forEach((_, i) => {
      const periodNumHeader = document.getElementById(i + 1);
      const periodNumList = Object.keys(this.weekJpToEn).map(dayJp => dayJp + (i + 1).toString());
      periodNumHeader.addEventListener('click', () => {
        search.periods = periodNumList;
        updateLectureTableBodyBySearchQuery();
      });
    });
    
    new this.Cell("集中", 0);
    document.getElementById("intensive").addEventListener(
      'click', this.cellMaster.get("集中").element.onclick
    );
  },  
  dayOrder: new Map(),
  // カレンダー生成(calendarCellMasterで管理)
  cellMaster: new Map(),
  // カレンダーの対応するセルを更新する
  // (引数はperiodsEn形式)
  update(periods) {
    if (periods) {
      periods.forEach(
        idJp => this.cellMaster.get(idJp).writeInCalendar()
      );
    } else {
      this.cellMaster.forEach(cell => cell.writeInCalendar())
    }
  },
  weekJpToEn: {
    '月': 'monday',
    '火': 'tuesday',
    '水': 'wednesday',
    '木': 'thursday',
    '金': 'friday',
  },
  idJpToEn: idJp => {
    if (idJp.includes("集中")) {
      return "intensive0";
    }
    const weekJp = idJp.charAt(0);
    const time = idJp.charAt(1);
    return calendar.weekJpToEn[weekJp] + time;
  },
  // カレンダーのマス
  Cell: class {
    constructor(weekJp, time) {
      // week: 曜日名英語小文字
      // time: 時限名整数
      this.idJp = weekJp in calendar.weekJpToEn
                ? `${weekJp}${time}`
                : "集中"; // 月1, 火2, 集中 など
      calendar.dayOrder.set(this.idJp, calendar.dayOrder.size);
      this.registeredLectureNames = new Set();
  
      this.element = document.getElementById(calendar.idJpToEn(this.idJp));
      // ここでdataset.defaultに入れた値をCSSで取り出して::afterで表示している
      this.element.dataset.default = `${this.idJp}検索`;
      this.element.addEventListener('click', () => {
        if (!(search.periods.includes(this.idJp))) {
          search.periods.push(this.idJp);
        } else {
          search.periods = search.periods.filter(v => v !== this.idJp);
        }
        updateLectureTableBodyBySearchQuery();
      });
      calendar.cellMaster.set(this.idJp, this);
    }

    // 講義をカレンダーに書き込む
    writeInCalendar() {
      // TODO: カレンダーの中身をもう少し凝った(科目ごとに箱が生成される、時間割アプリみたいな感じで)ものにする案はある
      // TODO: 一旦リセットの必要をなくせるかもしれない
      // リセットしてから
      this.registeredLectureNames.clear();
      // 曜限が同じ && 同名の授業がない場合に授業を追加する
      for (const lecture of registration.lectureIter) {
        if (
          lecture.periods.includes(this.idJp)
          && !this.registeredLectureNames.has(lecture.titleJp)
        ) {
          this.registeredLectureNames.add(lecture.titleJp);
          console.log(`${this.idJp} -> ${lecture.titleJp}`);
        }
      }
      this.element.innerText = [...this.registeredLectureNames].join("\n");
    }
  },
};
calendar.init();

// 指定曜限の表示(カレンダー/それを元に単位数も)を更新する。指定のない場合は全曜限を更新する
function updateCalendarAndCreditsCount(periods){
  calendar.update(periods);
  registration.updateCreditsCount();
}

// moduleLike: 講義詳細
const detailViews = {
  checkbox: document.getElementById("detail-checkbox"),
  class: document.getElementById("detail-class"),
  classroom: document.getElementById("detail-classroom"),
  code: document.getElementById("detail-code"),
  detail: document.getElementById("detail-detail"),
  evaluation: document.getElementById("detail-evaluation"),
  label: document.getElementById("detail-label"),
  lecturer: document.getElementById("detail-lecturer"),
  methods: document.getElementById("detail-methods"),
  notes: document.getElementById("detail-notes"),
  period: document.getElementById("detail-period"),
  schedule: document.getElementById("detail-schedule"),
  title: document.getElementById("detail-title"),
  type: document.getElementById("detail-type"),
  window: document.getElementById("detail-window"),
  stringJoiner: (...contents) => contents.join(" / "),
  update(lecture) {
    // テキスト部分
    this.class.textContent = this.stringJoiner(lecture.class);
    this.classroom.textContent = this.stringJoiner(lecture.classroom);
    this.code.textContent = this.stringJoiner(lecture.code, lecture.ccCode ?? "なし");
    this.detail.innerText = lecture.detail ?? "なし";
    this.evaluation.innerText = lecture.evaluation ?? "なし";
    this.lecturer.textContent = this.stringJoiner(lecture.lecturerJp, lecture.lecturerEn);
    this.methods.innerText = lecture.methods ?? "なし";
    this.notes.innerText = lecture.notes ?? "なし";
    this.period.textContent = this.stringJoiner(lecture.semester, lecture.periods.join("・"), `${lecture.credits}単位`);
    this.schedule.innerText = lecture.schedule ?? "なし";
    this.title.textContent = this.stringJoiner(lecture.titleJp, lecture.titleEn);
    this.type.textContent = this.stringJoiner(lecture.type, lecture.category);
    // ボタン部分
    const checkboxId = `checkbox-${lecture.code}`;
    this.label.htmlFor = checkboxId;
    this.checkbox.checked = document.getElementById(checkboxId).checked;
    // スクロール位置
    this.window.scrollTo(0, 0);
  },
};

// moduleLike: ハッシュ操作関連
const detailHash = {
  get code() {return location.hash.match(/^#\/detail\/(\d+)$/)?.[1]},
  set code(code) {location.hash = code ? `#/detail/${code}` : "#/top"},
  remove: () => {location.hash = "#/top"},
}

// ここをaddEventListenerに書き換えたら初期化のとき不具合が発生した
window.onhashchange = async () => {
  const code = detailHash.code;
  const lecture = code ? (await lectureDB.whole).find(l => l.code === code) : null;
  if (lecture) {
    detailViews.window.hidden = false;
    detailViews.update(lecture);
  } else {
    detailViews.window.hidden = true;
  }
};

// 独立しているウィンドウ切り替え関連ボタンにイベントリスナーを設定
// ここにまとめておく
{
  const autofillCompulsoryButton = document.getElementById("autofill-compulsory");
  autofillCompulsoryButton.addEventListener('click', () => {
    validateStatusAndTransitWindow(true);
  });
  const closeStatusButton = document.getElementById("close-status");
  closeStatusButton.addEventListener('click', () => {
    validateStatusAndTransitWindow(false);
  });

  const openStatusButton = document.getElementById("open-status");
  openStatusButton.addEventListener('click', () => innerWindow.changeTo("status"));
  const deleteAAButton = document.getElementById("delete-aa");
  deleteAAButton.addEventListener('click', () => innerWindow.changeTo("status"));
  const searchButton = document.getElementById("search-button");
  searchButton.addEventListener('click', () => innerWindow.toggle("search"));
  const settingsButton = document.getElementById("settings");
  settingsButton.addEventListener('click', () => innerWindow.toggle("settings"));

  const calendarWindow = document.getElementById("calendar-window");
  const changeCalendarDisplayButton = document.getElementById("change-calendar-display");
  changeCalendarDisplayButton.addEventListener('click', () => {
    calendarWindow.classList.toggle("fullscreen-window");
  });

  const resetAllButton = document.getElementById("reset-all");
  resetAllButton.addEventListener("click", () => {
    storageAccess.clear();
    detailHash.remove();
    location.reload();
  });

  const removeDetailButton = document.getElementById("detail-remove");
  removeDetailButton.addEventListener('click', detailHash.remove);
}

// 所属, 検索条件, 講義テーブル, カレンダー, 単位数, 講義詳細の初期化
async function initAndRestore() {
  // 先に講義テーブルの中身を初期化する(講義登録時に参照するため)
  initLectureTableBody();

  // localStorageの内容に合わせて状態を復元
  // 前回のデータが残っているかは所属情報の有無で判定
  if (personal.load()) {
    search.load();
    registration.load();
    // 必修選択画面を飛ばす
    validateStatusAndTransitWindow(false);
  }

  // 検索条件に依存する部分をここで更新
  setLectureTableHeader();
  
  // hashに応じた講義詳細を表示
  window.onhashchange();

  benchmark.log("* total time *");
}

initAndRestore();
