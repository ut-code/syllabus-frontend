"use strict";

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
//   "shortenedCategory": "総合E",
//   "shortenedEvaluation": "試験レポ",
//   "tableRow": (省略)
// }

const LAST_UPDATED = "2023S";

// TODO: 設定画面 -> プルダウンメニューに変更

const IS_DEVELOPMENT = true;

// moduleLike: ベンチマーク測定
const benchmark = IS_DEVELOPMENT
  ? {
      init() {
        console.log("* measure initializing time *");
        this.initTime = Date.now();
      },
      initTime: null,
      log(message) {
        console.log(message);
        console.log(Date.now() - this.initTime);
      },
    }
  : {
      init() {},
      initTime: null,
      log(message) {},
    };
benchmark.init();

// defaultdict from Python
class DefaultMap extends Map {
  constructor(entries, defaultfactory) {
    super(entries);
    this.defaultfactory = defaultfactory;
  }

  get(key) {
    if (!this.has(key) && this.defaultfactory) {
      this.set(key, this.defaultfactory());
    }
    return super.get(key);
  }
}

// DefaultMap(titleJp, Map(code, lecture))
class LectureCounter extends DefaultMap {
  constructor() {
    super(null, () => new Map());
  }

  getName(lecture) {return lecture.titleJp.replace("(教員・教室未定)", "")}

  push(...lectures) {
    for (const lecture of lectures) {
      this.get(this.getName(lecture)).set(lecture.code, lecture);
    }
    return this;
  }

  delete(lecture) {
    const name = this.getName(lecture);
    const isSuccess = this.get(name).delete(lecture.code);
    if (!this.get(name).size) {
      super.delete(name);
    }
    return isSuccess;
  }

  /**
   * @returns {boolean}
   */
  hasLecture(lecture) {return this.get(this.getName(lecture))?.has?.(lecture.code) ?? false}
}

// LectureNameCounterに曜限ごとの管理部分を追加
class LectureCounterPeriodScope extends LectureCounter {
  constructor() {
    super();
    this.byPeriod = new DefaultMap(null, () => new LectureCounter());
  }

  clear() {
    this.byPeriod.clear();
    super.clear();
  }

  push(...lectures) {
    for (const lecture of lectures) {
      for (const period of lecture.periods) {
        this.byPeriod.get(period).push(lecture);
      }
    }
    return super.push(...lectures);
  }

  delete(lecture) {
    for (const period of lecture.periods) {
      this.byPeriod.get(period).delete(lecture);
    }
    return super.delete(lecture);
  }

  get credits() {
    // 授業名ごとに講義を1つ取り出して単位数を加算していく
    let sum = 0;
    for (const codeToLecture of this.values()) {
      sum += Number([...codeToLecture.values()][0].credits);
    }
    return sum;
  }
}

// LectureNameCounterにセメスターごとの管理部分を追加
class LectureCounterSemesterScope {
  constructor(...semesters) {
    this.counters = new Map(semesters.map(
      semester => [semester, new LectureCounterPeriodScope()]
    ));
  }

  /**
   * @returns {IterableIterator<[string, Object]>} [code, lecture](all semesters - flatten)
   */
  *[Symbol.iterator]() {
    for (const counterPeriodScope of this.counters.values()) {
      for (const codeToLecture of counterPeriodScope.values()) {
        yield* codeToLecture;
      }
    }
  }
  
  /**
   * @returns {IterableIterator<string>} codes
   */
  *keys() {
    for (const [key, _] of this) {
      yield key;
    }
  }
  
  /**
   * @returns {IterableIterator<Object>} lectures
   */
  *values() {
    for (const [_, value] of this) {
      yield value;
    }
  }

  clear() {
    for (const counter of this.counters.values()) {
      counter.clear();
    }
  }

  push(...lectures) {
    for (const lecture of lectures) {
      this.counters.get(lecture.semester[0]).push(lecture);
    }
    return this;
  }

  delete(lecture) {
    return this.counters.get(lecture.semester[0]).delete(lecture);
  }

  has(lecture) {return [...this.counters.values()].some(counter => counter.hasLecture(lecture))}

  get credits() {
    let sum = 0;
    for (const counterPeriodScope of this.counters.values()) {
      sum += counterPeriodScope.credits;
    }
    return sum;
  }

  /**
   * @returns {Map<string, LectureCounter>} Map(semester, (LectureCounter = DefaultMap(titleJp, Map(code, lecture))))
   */
  periodOf(period) {
    return new Map([...this.counters].map(([semester, counterPeriodScope]) =>
      [semester, counterPeriodScope.byPeriod.get(period)]
    ));
  }
}

// moduleLike: localStorage

// 講義データ(lectureDB)
// 必修データ(compulsoryDB)
// 所属(科類, 学年, クラス)(personal)
// 検索条件(search.condition, calendar)
// 登録授業(registration)

// 非スカラー値の保存は少々手間なので予めラッパーを作っておく
// そのままだとDB類は容量的に入らないのでLZStringで圧縮する
const storageAccess = {
  setItem: (key, value) =>
    localStorage.setItem(key, LZString.compressToBase64(JSON.stringify(value))),
  getItem: (key) =>
    JSON.parse(
      LZString.decompressFromBase64(localStorage.getItem(key)) || "null"
    ),
  clear: () => localStorage.clear(),
};

// moduleLike: アクティブウィンドウ切り替え
const innerWindow = {
  coveredElements: [
    document.getElementById("credit-display"),
    document.getElementById("scroll-to-search"),
    document.getElementById("settings"),
  ],
  index: new Map([
    ["load", document.getElementById("loading-message")],
    ["main", document.getElementById("main-contents")],
    ["askiiArt", document.getElementById("aa-window")],
    ["status", document.getElementById("status-window")],
    ["settings", document.getElementById("settings-window")],
  ]),
  get activeWindowName() {
    for (const [targetWindowName, targetWindow] of this.index) {
      if (!targetWindow.hidden) {
        return targetWindowName;
      }
    }
    return undefined;
  },
  changeTo(windowName) {
    for (const [targetWindowName, targetWindow] of this.index) {
      const isTarget = windowName === targetWindowName;
      targetWindow.hidden = !isTarget;
      if (isTarget) {
        for (const element of this.coveredElements) {
          element.hidden = targetWindow.classList.contains(
            "over-fullscreen-window"
          );
        }
      }
    }
  },
  toggle(primaryWindowName) {
    this.changeTo(
      this.activeWindowName !== primaryWindowName ? primaryWindowName : "main"
    );
  },
};
innerWindow.changeTo("load");

// moduleLike: ハッシュ操作関連
const hash = {
  get code() {
    return location.hash.match(/^#\/detail\/(\d+)$/)?.[1] ?? null;
  },
  set code(code) {
    location.hash = code ? `#/detail/${code}` : "#/top";
  },
  remove: () => {
    location.hash = "#/top";
  },
};

// moduleLike: 文字列処理
const textUtils = {
  // テキストの全角英数字, 全角スペース, 空文字を除去する
  // 分かりにくいが、3行目の"～"は全角チルダであり、波ダッシュではない
  // 小文字にはしないので検索時は別途toLowerCase()すること
  normalize: (text) =>
    (text ?? "")
      .trim()
      .replace(/[\s　]+/g, " ")
      .replace(/[！-～]/g, (s) =>
        String.fromCharCode(s.charCodeAt(0) - 0xfee0)
      ),
  toSearch(text) {
    return this.normalize(text)
      .toLowerCase()
      .replace(/_‐―−ｰー〜~￣/g, "-");
  },
};

// moduleLike: データベース
// callback: lectureTable

const lectureDB = {
  async init() {
    this.availableCheckbox.addEventListener("click", () =>
      lectureTable.update()
    );
  },
  whole: (async () => {
    benchmark.log("* DB init start *");

    // キャッシュがあるならそれを持ってくる
    const loadedLectureList = storageAccess.getItem("lectureDB");
    if (loadedLectureList) {
      benchmark.log("* load DB from cache *");

      return loadedLectureList;
    }

    // from former system's code

    // 系列の短縮表現を得る
    const getShortenedCategory = (category) => {
      switch (category) {
        case "Ｌ（言語・コミュニケーション）":
          return "L";
        case "Ａ（思想・芸術）":
          return "A";
        case "Ｂ（国際・地域）":
          return "B";
        case "Ｃ（社会・制度）":
          return "C";
        case "Ｄ（人間・環境）":
          return "D";
        case "Ｅ（物質・生命）":
          return "E";
        case "Ｆ（数理・情報）":
          return "F";
        default:
          return "";
      }
    };
    // 評価方法の短縮表現を得る
    const getShortenedEvaluation = (text) => {
      if (!text) {
        return "不明";
      }
      return [
        /試験|(期末|中間)テスト|(E|e)xam/.test(text) ? "試験" : "",
        /レポート|提出|課題|宿題|(A|a)ssignments|(R|r)eport|(H|h)omework|(P|p)aper/.test(
          text
        )
          ? "レポ"
          : "",
        /出席|出欠|(A|a)ttendance|参加|(P|p)articipation/.test(text)
          ? "出席"
          : "",
        /平常点|小テスト|参加|(P|p)articipation/.test(text) ? "平常" : "",
      ].join("");
    };

    benchmark.log("* DB process start *");

    const allClassListUrl = "./classList/data-beautified2023.json";
    const response = await fetch(allClassListUrl);

    benchmark.log("* DB init fetch *");

    const allLectureList = await response.json();

    benchmark.log("* DB init json-ize *");

    // テキストを正規化する
    for (const lecture of allLectureList) {
      lecture.titleJp = textUtils.normalize(lecture.titleJp);
      lecture.titleEn = textUtils.normalize(lecture.titleEn);
      lecture.lecturerJp = textUtils.normalize(lecture.lecturerJp);
      lecture.lecturerEn = textUtils.normalize(lecture.lecturerEn);
      lecture.ccCode = textUtils.normalize(lecture.ccCode);
      lecture.semester = textUtils.normalize(lecture.semester);
      lecture.credits = textUtils.normalize(lecture.credits);
      lecture.classroom = textUtils.normalize(lecture.classroom);
      lecture.shortenedCategory =
        lecture.type + getShortenedCategory(lecture.category);
      lecture.shortenedEvaluation = getShortenedEvaluation(lecture.evaluation);
      if (lecture.shortenedEvaluation === "試験レポ出席平常") {
        lecture.shortenedEvaluation = "試験レポ<wbr>出席平常";
      }
    }

    benchmark.log("* DB init end *");

    // setTimeoutしても、結局メインの動作は止まる
    storageAccess.setItem("lectureDB", allLectureList);

    benchmark.log("* DB cached *");

    return allLectureList;
  })(),
  get reference() {
    return this.availableCheckbox.checked ? this.specified : this.whole;
  },
  specified: undefined,
  availableCheckbox: document.getElementById("available-only"),
  async setSpecificator(filter) {
    this.specified = (await this.whole).filter(filter);
  },
};
lectureDB.init();

// moduleLike: 講義詳細
const detailViews = {
  init() {
    const removeDetailButton = document.getElementById("detail-remove");
    removeDetailButton.addEventListener("click", hash.remove);

    window.addEventListener("hashchange", () => void this.onHashChange());
  },
  async onHashChange() {
    const code = hash.code;
    const lecture = code
      ? (await lectureDB.whole).find((l) => l.code === code)
      : null;
    if (lecture) {
      this.window.hidden = false;
      this.update(lecture);
    } else {
      this.window.hidden = true;
    }
  },
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
  join: (...contents) => contents.join(" / "),
  getJoiner:
    (regexp) =>
    (...contents) =>
      contents
        .map((v) =>
          v
            ? v.replace(regexp, "<mark>$&</mark>").replace("\n", "<br>")
            : "なし"
        )
        .join(" / "),
  update(lecture) {
    // テキスト部分
    this.class.textContent = lecture.class;
    this.period.textContent = this.join(
      lecture.semester,
      lecture.periods.join("・"),
      `${lecture.credits}単位`
    );
    this.type.textContent = this.join(lecture.type, lecture.category);

    // 検索ハイライトを当てる部分
    const highlightWords = new RegExp(
      search.textInput.keywords[0].join("|"),
      "g"
    );
    const joinWithHighlight = this.getJoiner(highlightWords);
    this.title.innerHTML = joinWithHighlight(lecture.titleJp, lecture.titleEn);
    this.lecturer.innerHTML = joinWithHighlight(
      lecture.lecturerJp,
      lecture.lecturerEn
    );
    this.detail.innerHTML = joinWithHighlight(lecture.detail);
    this.classroom.innerHTML = joinWithHighlight(lecture.classroom);
    this.methods.innerHTML = joinWithHighlight(lecture.methods);
    this.evaluation.innerHTML = joinWithHighlight(lecture.evaluation);
    this.notes.innerHTML = joinWithHighlight(lecture.notes);
    this.schedule.innerHTML = joinWithHighlight(lecture.schedule);
    this.code.innerHTML = joinWithHighlight(lecture.code, lecture.ccCode);
    // ボタン部分
    const checkboxId = `checkbox-${lecture.code}`;
    this.label.htmlFor = checkboxId;
    this.checkbox.checked = document.getElementById(checkboxId).checked;
    // スクロール位置
    this.window.scrollTo(0, 0);
  },
};
detailViews.init();

// moduleLike: 曜限計算
const periodsUtils = {
  init() {
    for (let time = 1; time <= 6; time++) {
      this.headerIdToPeriods.set(`all-${time}`, []);
    }
    for (const [dayJp, dayEn] of this.dayJpToEn) {
      const dayId = `${dayEn}-all`;
      this.headerIdToPeriods.set(dayId, []);
      for (let time = 1; time <= 6; time++) {
        const period = `${dayJp}${time}`;
        this.periodToId.set(period, `${dayEn}-${time}`);
        this.headerIdToPeriods.get(dayId).push(period);
        this.headerIdToPeriods.get(`all-${time}`).push(period);
      }
    }
    this.headerIdToPeriods.set("intensive-all", ["集中"]);
    this.periodToId.set("集中", "intensive-0");
  },
  dayJpToEn: new Map([
    ["月", "monday"],
    ["火", "tuesday"],
    ["水", "wednesday"],
    ["木", "thursday"],
    ["金", "friday"],
  ]),
  headerIdToPeriods: new Map(),
  periodToId: new Map(),
};
periodsUtils.init();

// moduleLike: 登録授業
// 依存先: storageAccess, lectureDB, periodsUtils

// TODO: lectureCounterの仕様見直し <- 必要な機能を洗い出して最適化する
// TODO: 必修を切り出す -> lectureCounterをクラス化して必修用に作る必要がある?
// TODO: 単位計算に使用する科目の文字色を変える?(可能なのか?)
// -> 多分アルゴリズムから練る必要がある
const registration = {
  // 単位計算＆表示用の名前ごとのカウンタ
  lectureCounter: new LectureCounterSemesterScope("S", "A"),
  // 授業が登録されているか
  has(lecture) {
    return this.lectureCounter.has(lecture);
  },
  // 登録リストに授業を入れる
  add(lecture) {
    this.lectureCounter.push(lecture);
    this.save();
  },
  // 登録リストから授業を削除する
  delete(lecture) {
    this.lectureCounter.delete(lecture);
    this.save();
  },
  // 登録リストを初期化する
  clear() {
    // 講義テーブルの登録ボタンの表示を実態に合わせる
    for (const lecture of this.lectureCounter.values()) {
      const button = lecture.tableRow.lastElementChild.childNodes[0];
      if (button) {
        // click()にしていないのは再描画の繰り返しを避けるため
        button.checked = false;
      }
    }
    this.lectureCounter.clear();
    this.save();
  },
  // 登録ボタン以外から複数授業を登録する
  async setByFilter(lectureFilter, isSpecified) {
    const lectureList = (
      await lectureDB[isSpecified ? "specified" : "whole"]
    ).filter(lectureFilter);
    for (const lecture of lectureList) {
      // 講義テーブルの登録ボタンの表示を実態に合わせる
      const button = lecture.tableRow.lastElementChild.childNodes[0];
      if (button) {
        // click()にしていないのは再描画の繰り返しを避けるため
        button.checked = true;
      }
    }
    this.lectureCounter.push(...lectureList);
    this.save();
  },
  save() {
    storageAccess.setItem("registeredCodes", [...this.lectureCounter.keys()]);
  },
  load() {
    const registeredCodes = new Set(storageAccess.getItem("registeredCodes"));
    if (registeredCodes.size) {
      this.setByFilter((lecture) => registeredCodes.has(lecture.code), false);
      return true;
    }
    return false;
  },
  // TODO: 所管移動? -> calendar
  creditDisplay: document.getElementById("credit-counter"),
  // 単位数を計算し、表示に反映させる
  updateCreditsCount() {
    this.creditDisplay.textContent = this.lectureCounter.credits;
  },
};

// calendar, search
// 子要素の変更に対応して講義テーブルを更新する
const registeredLectureLabel = document.getElementById(
  "registered-lecture-label"
);
const updateByClick = (ev) => {
  const target = ev.target;
  switch (target?.tagName) {
    case "LABEL":
    case "BUTTON":
      if (target !== registeredLectureLabel) {
        search.showRegisteredButton.checked = false;
      }
      setTimeout(() => lectureTable.update(), 0);
  }
};

// moduleLike: カレンダー
// 依存先: periodsUtils, registration
// callback: search, lectureTable

// 機能: 登録授業の表示, 検索機能の呼び出し, 検索対象の曜限を保持

// TODO: 可能であればS1/S2をカレンダー上で区別できると嬉しい(でもどうやって?)
const calendar = {
  init() {
    // 空きコマ選択ボタン
    const selectBlankButton = document.getElementById("blank-period");
    selectBlankButton.addEventListener("click", () => this.selectBlank());
    // 曜限リセットボタン
    const resetPeriodButton = document.getElementById("all-period");
    resetPeriodButton.addEventListener("click", () => this.set([]));

    // 各曜日, 各時間帯に検索機能を設定
    for (const [id, reference] of periodsUtils.headerIdToPeriods) {
      const header = document.getElementById(id);
      header.addEventListener("click", () => this.toggle(reference));
    }
  },
  // Map(period, element)
  // TODO: HTML構成部分切り出し
  periodToElement: (() => {
    // 子要素の変更に対応して講義テーブルを更新する
    const calendarContainer = document.getElementById("calendar-container");
    calendarContainer.addEventListener("click", updateByClick);

    // ここで要素を構成する
    const createTh = (day, time, text) => {
      const th = document.createElement("th");
      const button = document.createElement("button");
      button.id = `${day}-${time}`;
      button.textContent = text;
      th.append(button);
      return th;
    };
    const createTd = (day, time) => {
      const id = `${day}-${time}`;
      const cid = `c-${id}`;

      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = cid;
      checkbox.hidden = true;
      const label = document.createElement("label");
      label.htmlFor = cid;
      label.id = id;
      td.append(checkbox, label);
      return td;
    };

    // 外側
    const timeTable = document.createElement("table");
    timeTable.id = "time-table";
    calendarContainer.append(timeTable);
    const timeTableHead = document.createElement("thead");
    const timeTableBody = document.createElement("tbody");
    timeTable.append(timeTableHead, timeTableBody);
    const timeTableHeadRow = document.createElement("tr");
    timeTableHead.append(timeTableHeadRow);

    // 曜日行
    timeTableHeadRow.append(document.createElement("th"));
    for (const [dayJp, dayEn] of periodsUtils.dayJpToEn) {
      timeTableHeadRow.append(createTh(dayEn, "all", dayJp));
    }
    // 1~6限
    for (const time of [1, 2, 3, 4, 5, 6]) {
      const tr = document.createElement("tr");
      timeTableBody.append(tr);
      tr.append(createTh("all", time, time));
      for (const dayEn of periodsUtils.dayJpToEn.values()) {
        tr.append(createTd(dayEn, time))
      }
    }
    // 集中
    const tr = document.createElement("tr");
    timeTableBody.append(tr);
    tr.append(createTh("intensive", "all", "集"));
    const td = createTd("intensive", 0);
    td.colSpan = 5;
    tr.append(td);

    return new Map(
      [...periodsUtils.periodToId].map(([period, id]) => [
        period,
        document.getElementById(id),
      ])
    );
  })(),

  // 以下、registrationの表示機能
  // カレンダーの指定曜限の表示を更新する(単位数も)
  update(periods) {
    registration.updateCreditsCount();
    for (const period of periods ?? this.periodToElement.keys()) {
      const element = this.periodToElement.get(period);
      element.textContent = "";
      for (const [semester, counter] of registration.lectureCounter.periodOf(period)) {
        for (const [name, codeToLecture] of counter) {
          const num = codeToLecture.size;
          const lectureBox = document.createElement("button");
          lectureBox.className = "lecture-box";
          lectureBox.textContent = `${name}${num === 1 ? "" : ` (${num})`}`;
          lectureBox.tabIndex = -1;
          // labelのclick時のデフォルトの挙動(対応するinputのclick時挙動の呼び出し)は
          // 子要素からのバブリング時には発生しない
          lectureBox.addEventListener("click", function (ev) {
            ev.stopPropagation();
            this.parentElement.click();
          });
          element.appendChild(lectureBox);
        }
      }
    }
  },

  // 以下、searchのフィルタ機能
  // search用にオブジェクトに変換
  get index() {
    const index = Object.fromEntries(
      [...this.periodToElement].map(([period, element]) => [
        period,
        element.control.checked,
      ])
    );
    // 基礎生命科学実験αが"集中6"なのでその対応
    index["集中6"] = index["集中"];
    return index;
  },
  // 指定の曜限のみチェックが入っている状態にする
  set(periods) {
    for (const [period, element] of this.periodToElement) {
      const setTo = periods.includes(period);
      element.control.checked = setTo;
    }
  },
  // 空きコマのみ選択
  selectBlank() {
    for (const [period, element] of this.periodToElement) {
      const setTo = !element.hasChildNodes() && period !== "集中";
      element.control.checked = setTo;
    }
  },
  // 指定の曜限のチェック状態を入れ替える
  toggle(periods) {
    const setTo = !periods.every(
      (period) => this.periodToElement.get(period).control.checked
    );
    for (const period of periods) {
      this.periodToElement.get(period).control.checked = setTo;
    }
  },
  save() {
    storageAccess.setItem(
      "periods",
      [...periodsUtils.periodToId.keys()].filter(
        (period) => this.periodToElement.get(period).control.checked
      )
    );
  },
  load() {
    const indexRestored = storageAccess.getItem("periods");
    if (indexRestored) {
      this.set(indexRestored);
      return true;
    }
    return false;
  },
};
calendar.init();

// アクセシビリティ対応
// (キー操作で要素を選択した時のみフォーカスが残るようにし、自然な表示にする)
window.addEventListener("keydown", (ev) => {
  const target = ev.target;
  switch (target?.tagName) {
    case "LABEL":
    case "BUTTON":
      switch (ev.key) {
        case " ":
        case "Enter":
          target.click();
          target.focus();
          ev.preventDefault();
      }
  }
});
window.addEventListener("click", (ev) => {
  const target = ev.target;
  switch (target?.tagName) {
    case "INPUT":
    case "SELECT":
      break;
    default:
      target.blur();
  }
});

// moduleLike: 検索機能

// init-callback: lectureTable
// 依存先: storageAccess, registration, calendar

// TODO: "登録授業表示", "履修可能科目のみ表示"の保存 -> しなくてもそこまで問題なさそう
const search = {
  init() {
    // 子要素の変更に対応して講義テーブルを更新する
    const searchPanel = document.getElementById("search-panel");
    searchPanel.addEventListener("click", updateByClick);
    const searchButton = document.getElementById("scroll-to-search");
    searchButton.addEventListener("click", function (ev) {
      this.blur();
      // 順番が逆だとスクロールしない(対象がhiddenのため)
      innerWindow.changeTo("main");
      searchPanel.scrollIntoView({ behavior: "smooth" });
      // スクロールのためにバブリングを禁止(アクセシビリティ対応とのフォーカスに関する相互作用)
      ev.stopPropagation();
    });
    searchButton.addEventListener("keydown", (ev) => ev.stopPropagation());

    // フリーワード検索の発動
    const updateCallback = () => void lectureTable.update();
    this.textInput.freewordTextBox.addEventListener("change", updateCallback);
    this.textInput.freewordTextBox.addEventListener("keyup", updateCallback);
    // ブラウザ補助機能で検索欄をクリアした際にも表示を更新する(このときchangeイベントは発行されない)
    this.textInput.freewordTextBox.addEventListener("input", function () {
      if (!this.value) {
        updateCallback();
      }
    });
    const tableContainer = document.getElementById("view-table-container");
    this.textInput.freewordTextBox.addEventListener("keydown", (ev) => {
      // IME変換中でないEnterでのみイベントを発火させる
      // TODO: FireFoxでの動作確認
      if (!(ev.key === "Enter" && !ev.isComposing)) {
        return;
      }
      ev.preventDefault();
      // 検索結果が単一の場合、直接講義詳細に遷移する
      if (this.jumpTo) {
        hash.code = this.jumpTo;
      } else {
        tableContainer.scrollIntoView({ behavior: "smooth" });
      }
      this.textInput.update();
    });
    this.textInput.freewordTextBox.addEventListener("blur", () =>
      this.textInput.update()
    );

    // 曜限以外リセットボタン
    const resetConditionButton = document.getElementById("reset-condition");
    resetConditionButton.addEventListener("click", () => 
      this.condition.reset()
    );

    // フィルタ表示初期化
    this.condition.init();
  },
  condition: {
    init() {
      const generateBinaryButton = (category, name) => {
        const checkbox = document.createElement("input");
        const label = document.createElement("label");
        checkbox.type = "checkbox";
        checkbox.name = `${category}-${name}`;
        checkbox.hidden = true;
        label.className = "c-binary f-clickable b-circle";
        label.tabIndex = 0;
        label.role = "button";

        const checkboxId = `checkbox-${category}-${name}`;
        checkbox.id = checkboxId;
        label.htmlFor = checkboxId;
        label.textContent = this.nameTable[name];

        const wrapper = document.createElement("div");
        wrapper.className = "accordion-child";
        wrapper.append(checkbox, label);
        
        this.toElement.get(category).set(name, checkbox);
        return wrapper;
      };
      const generateTernaryButton = (category, name) => {
        const wrapper = document.createDocumentFragment();
        const header = document.createElement("div");
        header.textContent = this.nameTable[name];
        header.className = "internal-header";
        wrapper.append(header);
  
        const condition = ["must", "reject"];
        const checkboxList = [];
        for (const reaction of condition) {
          const checkbox = document.createElement("input");
          const label = document.createElement("label");
          checkbox.type = "checkbox";
          checkbox.name = `${category}-${name}`;
          checkbox.hidden = true;
          label.className = `${reaction} f-clickable b-circle c-binary`;
          label.tabIndex = 0;
          label.role = "button";
  
          const radioId = `${category}-${name}-${reaction}`;
          checkbox.id = radioId;
          label.htmlFor = radioId;
  
          checkboxList.push(checkbox);

          const buttonComponent = document.createElement("div");
          buttonComponent.className = "accordion-child";
          buttonComponent.append(checkbox, label);
  
          wrapper.append(buttonComponent);
        }
        checkboxList.forEach(
          (element, index, array) => {
            element.addEventListener("click", function() {
              if (this.checked) {
                array[1 - index].checked = false;
              }
            })
          }
        );

        this.toElement.get(category).set(name, checkboxList);
        return wrapper;
      };
      const generateSection = (headName, optionIterable, isTernary) => {
        const section = document.createElement("section");
        const exSummary = document.createElement("header");
        exSummary.textContent = this.nameTable[headName];
        const wrapper = document.createElement("div");
        wrapper.className = "accordion-parent";
        wrapper.id = headName;
        if (isTernary) {
          for (const name of ["含む", "除外"]) {
            const header = document.createElement("div");
            header.textContent = name;
            header.className = "internal-header";
            wrapper.append(header);
          }
          for (const option of optionIterable) {
            wrapper.append(generateTernaryButton(headName, option));
          }
        } else {
          for (const option of optionIterable) {
            wrapper.append(generateBinaryButton(headName, option));
          }
        }
        section.append(exSummary, wrapper);
        return section;
      };
      const generateAll = () => {
        for (const [headName, optionToElement] of this.toElement) {
          const section = generateSection(
            headName,
            optionToElement.keys(),
            headName === "evaluation"
          );
          this.box.appendChild(section);
        }
      };

      generateAll();
    },
    box: document.getElementById("search-condition"),
    // {category || option: string}
    nameTable: {
      semester: "学期",
      S_: "S",
      S1: "S1",
      S2: "S2",
      A_: "A",
      A1: "A1",
      A2: "A2",

      evaluation: "評価方法",
      exam: "試験",
      paper: "レポ",
      attendance: "出席",
      participation: "平常",

      category: "種別",
      foundation: "基礎",
      requirement: "要求",
      thematic: "主題",
      intermediate: "展開",
      L: "総合L",
      A: "総合A",
      B: "総合B",
      C: "総合C",
      D: "総合D",
      E: "総合E",
      F: "総合F",

      registration: "登録",
      unregistered: "未登録",
      registered: "登録済",

      periods: "曜限",
      title: "科目名",
      lecturer: "教員",
      credits: "単位",
    },
    // Map(category, Map(option, element))
    toElement: new Map([
      ["semester", new Map([
        ["S_", null],
        ["S1", null],
        ["S2", null],
        ["A_", null],
        ["A1", null],
        ["A2", null],
      ])],
      ["evaluation", new Map([
        ["exam", null],
        ["paper", null],
        ["attendance", null],
        ["participation", null],
      ])],
      ["category", new Map([
        ["foundation", null],
        ["requirement", null],
        ["thematic", null],
        ["intermediate", null],
        ["L", null],
        ["A", null],
        ["B", null],
        ["C", null],
        ["D", null],
        ["E", null],
        ["F", null],
      ])],
      ["registration", new Map([
        ["unregistered", null],
        ["registered", null],
      ])],
    ]),
    // {category: [optionName, isActive][]}
    get index() {
      const index = {};
      for (const [category, subMap] of this.toElement) {
        const options = [];
        index[category] = options;
        for (const [option, element] of subMap) {
          let isActive;
          if (element.constructor.name === "Array") {
            isActive = element[0].checked ? true : element[1].checked ? false : null;
          } else {
            isActive = element.checked;
          }
          options.push([option, isActive]);
        }
      }
      return index;
    },
    // 単一のフィルタに値をセットする
    _set(category, option, isActive) {
      const target = this.toElement.get(category).get(option);
      if (isActive === undefined) {
        return;
      }
      if (typeof isActive === "function") {
        isActive = isActive(category, option);
      }
      if (target.constructor.name === "Array") {
        target[0].checked = isActive ?? false;
        target[1].checked = !(isActive ?? true);
      } else {
        target.checked = isActive;
      }
    },
    // 複数のフィルタに一括で値をセットする
    set(indexOrFilter) {
      if (!indexOrFilter) {
        return;
      }
      if (typeof indexOrFilter === "function") {
        for (const [category, optionAndIsActive] of this.toElement) {
          for (const option of optionAndIsActive.keys()) {
            this._set(category, option, indexOrFilter);
          }
        }
      } else {
        for (const [category, optionAndIsActive] of Object.entries(indexOrFilter)) {
          for (const [option, isActive] of optionAndIsActive) {
            this._set(category, option, isActive);
          }
        }
      }
    },
    // フィルタを初期状態に戻す
    reset() {
      this.set((category, option) => category === "evaluation"
        ? null
        : category !== "category" || ["A", "B", "C", "D", "E", "F"].includes(option) || (personal.get().stream.includes("l") && option === "L")
      );
    },
    save() {
      storageAccess.setItem("condition", this.index);
    },
    load() {
      const indexRestored = storageAccess.getItem("condition");
      if (indexRestored) {
        this.set(indexRestored);
        return true;
      }
      return false;
    },
  },
  textInput: {
    freewordTextBox: document.getElementById("search-freeword"),
    searchAllCheck: document.getElementById("do-search-all"),
    suggestionList: document.getElementById("freeword-datalist"),
    inputHistory: [],
    get keywords() {
      const keywordsPositive = [];
      const keywordsNegative = [];
      for (const keyword of textUtils
        .toSearch(this.freewordTextBox.value)
        .split(" ")) {
        if (keyword.startsWith("-") && keyword.length > 1) {
          keywordsNegative.push(keyword.slice(1));
        } else {
          keywordsPositive.push(keyword);
        }
      }
      return [keywordsPositive, keywordsNegative];
    },
    updateHistory() {
      const query = this.freewordTextBox.value;
      if (!query) {
        return;
      }
      this.inputHistory = [
        query,
        ...this.inputHistory.filter((text) => text !== query),
      ];
      if (this.inputHistory.length > 10) {
        this.inputHistory.pop();
      }
      this.save();
    },
    updateSuggestion() {
      this.suggestionList.textContent = "";
      for (const history of this.inputHistory) {
        const option = document.createElement("option");
        option.value = history;
        this.suggestionList.appendChild(option);
      }
    },
    save() {
      storageAccess.setItem("inputHistory", this.inputHistory);
    },
    load() {
      this.inputHistory = storageAccess.getItem("inputHistory") ?? [];
      this.updateSuggestion();
      return Boolean(this.inputHistory.length);
    },
    update() {
      this.updateHistory();
      this.updateSuggestion();
    },
  },
  get nonRegisteredFilter() {
    const condition = this.condition.index;
    const nameTable = this.condition.nameTable;
    const periods = calendar.index;
    const skipPeriods =
      Object.values(periods).every((b) => !b) ||
      Object.values(periods).every((b) => b);
    const evaluationCondition = condition.evaluation;
    const categoryCondition = condition.category;
    const semesterCondition = condition.semester;
    const registrationCondition = condition.registration;
    const skipEvaluationMust = evaluationCondition.every(
      ([k, v]) => !v
    );
    const skipEvaluationReject = evaluationCondition.every(
      ([k, v]) => v ?? true
    );
    const skipCategory =
      categoryCondition.every(([k, v]) => !v) ||
      categoryCondition.every(([k, v]) => v);
    const skipSemester =
      semesterCondition.every(([k, v]) => !v) ||
      semesterCondition.every(([k, v]) => v);
    const skipRegistration =
      registrationCondition.every(([k, v]) => !v) ||
      registrationCondition.every(([k, v]) => v);
    const [keywordsPositive, keywordsNegative] = this.textInput.keywords;
    const searchTarget = this.textInput.searchAllCheck.checked
      ? [
          "titleJp",
          "titleEn",
          "lecturerJp",
          "lecturerEn",
          "detail",
          "classroom",
          "methods",
          "evaluation",
          "notes",
          "schedule",
          "code",
          "ccCode",
        ]
      : ["titleJp", "titleEn"];
    return (lecture) =>
      (!keywordsPositive.length ||
        keywordsPositive.every((query) =>
          searchTarget.some((target) =>
            textUtils.toSearch(lecture[target]).includes(query)
          )
        )) &&
      (!keywordsNegative.length ||
        !keywordsNegative.some((query) =>
          searchTarget.some((target) =>
            textUtils.toSearch(lecture[target]).includes(query)
          )
        )) &&
      (skipCategory ||
        categoryCondition.some(
          ([k, v]) => v && lecture.shortenedCategory === nameTable[k]
        )) &&
      (skipEvaluationMust ||
        evaluationCondition.some(
          ([k, v]) =>
            v && lecture.shortenedEvaluation.includes(nameTable[k])
        )) &&
      (skipEvaluationReject ||
        !evaluationCondition.some(
          ([k, v]) =>
            !(v ?? true) && lecture.shortenedEvaluation.includes(nameTable[k])
        )) &&
      (skipRegistration ||
        registrationCondition.some(
          ([k, v]) =>
            v && registration.has(lecture) === (nameTable[k] === "登録済")
        )) &&
      (skipSemester ||
        semesterCondition.some(
          ([k, v]) => v && lecture.semester === nameTable[k]
        )) &&
      (skipPeriods ||
        lecture.periods.some((targetPeriod) => periods[targetPeriod]));
  },
  // 講義詳細に直接遷移するための時間割コード
  jumpTo: null,
  async getResult() {
    const result = this.showRegisteredButton.checked
      ? (await lectureDB.whole).filter((lecture) => registration.has(lecture))
      : (await lectureDB.reference).filter(this.nonRegisteredFilter);
    this.jumpTo = result.length === 1 ? result[0].code : null;
    return result;
  },
  // 登録授業一覧ボタン
  showRegisteredButton: document.getElementById("registered-lecture"),
};
search.init();

// moduleLike: 講義テーブル

// 依存先: lectureDB, search

// TODO: カレンダーの行や"追加"ボタンをtabキーで選択可能にする(アクセシビリティ)
const lectureTable = {
  async init() {
    // 講義テーブル用の登録ボタンを生成する
    const generateRegisterButton = (lecture) => {
      const tdOfButton = document.createElement("td");
      tdOfButton.className = "registration-col";

      // バブリング防止(これがないと登録ボタンクリックで詳細が開いてしまう)
      tdOfButton.addEventListener("click", (ev) => {
        ev.stopPropagation();
      });

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.hidden = true;
      const label = document.createElement("label");
      label.className = "register-button";

      const checkboxId = `checkbox-${lecture.code}`;
      checkbox.id = checkboxId;
      label.htmlFor = checkboxId;

      checkbox.addEventListener("change", () => {
        if (hash.code === lecture.code) {
          detailViews.checkbox.checked = checkbox.checked;
        }
        registration[checkbox.checked ? "add" : "delete"](lecture);
        calendar.update(lecture.periods);
      });

      tdOfButton.append(checkbox, label);

      return tdOfButton;
    };
    // 講義情報からテーブルの行(ボタン含む)を生成する
    const generateRow = (lecture) => {
      const tr = document.createElement("tr");
      tr.insertAdjacentHTML(
        "afterbegin",
        `
<td class="semester-col">${lecture.semester}</td>
<td class="periods-col">${lecture.periods.join("<br>")}</td>
<td class="category-col">${lecture.shortenedCategory}</td>
<td class="title-col">${lecture.titleJp}</td>
<td class="lecturer-col">${lecture.lecturerJp}</td>
<td class="evaluation-col">${lecture.shortenedEvaluation}</td>
<td class="credits-col">${lecture.credits}</td>
`
      );
      tr.id = `tr${lecture.code}`;
      lecture.tableRow = tr;

      // 行(登録ボタン除く)をクリックしたときに詳細が表示されるようにする
      tr.addEventListener("click", () => {
        hash.code = hash.code !== lecture.code ? lecture.code : null;
      });

      // 行に要素として追加
      tr.appendChild(generateRegisterButton(lecture));

      return tr;
    };

    benchmark.log("* table init start *");

    this.body.hidden = true;
    for (const lecture of await lectureDB.whole) {
      this.body.appendChild(generateRow(lecture));
    }
    this.body.hidden = false;

    benchmark.log("* table init end *");

    innerWindow.changeTo("status");
  },
  body: document.getElementById("search-result").lastElementChild,
  statusBox: document.getElementById("search-status"),
  showStatus(message) {
    this.statusBox.textContent = message;
  },
  async update() {
    // 一旦全ての行を非表示にする
    for (const tr of this.body.children) {
      tr.hidden = true;
    }
    // 表示すべき行のみ表示する
    const lecturesToDisplay = await search.getResult();
    for (const lecture of lecturesToDisplay) {
      lecture.tableRow.hidden = false;
    }
    // 現在の状態を表示する
    this.showStatus(`検索結果 — ${lecturesToDisplay.length}件`);
    // 永続化
    search.condition.save();
    calendar.save();
  },
};

// TODO: 以下の必修関連をまとめる?

// moduleLike: AA表示

// 初期化は遅延されている
const AA = {
  async show() {
    if (!this.DB) {
      this.DB = Promise.all(
        ["./classList/error1.txt", "./classList/error2.txt"].map(async (url) =>
          (await fetch(url)).text()
        )
      );
      this.drawBox = document.getElementById("askii-art");
      this.pattern = 2;
      const deleteAAButton = document.getElementById("delete-aa");
      deleteAAButton.addEventListener("click", () =>
        innerWindow.changeTo("status")
      );
    }
    const randomIndex = Math.floor(Math.random() * this.pattern);
    this.drawBox.innerText = (await this.DB)[randomIndex];
    innerWindow.changeTo("askiiArt");
    // "少し、頭冷やそうか。";
    // "おイタしちゃだめにょろよ。";
  },
};

// moduleLike: 所属情報
const personal = {
  init() {
    this.classNumber.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        validateStatusAndTransitWindow(true);
        ev.preventDefault();
      }
    });
  },
  stream: document.getElementById("compulsory"),
  grade: document.getElementById("grade"),
  classNumber: document.getElementById("class-number"),
  get() {
    return {
      stream: this.stream.value,
      classNumber: this.classNumber.value,
      grade: this.grade.value,
    };
  },
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
      this.set(personalStatus);
      return true;
    }
    return false;
  },
};
personal.init();

// Promise([1年必修の一覧, 2年必修の一覧])
const compulsoryDB = (async () => {
  benchmark.log("* compulsory init start *");

  const loadedCompulsoryDB = storageAccess.getItem("compulsoryDB");
  if (loadedCompulsoryDB) {
    benchmark.log("* load compulsory from cache *");

    return loadedCompulsoryDB;
  }

  const compulsoryDB = Promise.all(
    [
      "./classList/requiredLecture2023.json",
      "./classList/requiredLecture2023_2.json",
    ].map(async (url) => (await fetch(url)).json())
  );

  setTimeout(async () => {
    storageAccess.setItem("compulsoryDB", await compulsoryDB);
    benchmark.log("* compulsory cached *");
  }, 0);

  return compulsoryDB;
})();

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
  const { stream, classNumber, grade } = personalStatus;
  const classId = `${stream}_${classNumber}`;
  const classIdGeneral = `${stream}_all`;

  benchmark.log("* get requiredCodeList start *");

  // 必修のコードの配列. 必修がない場合は空リスト(truthy), DBにインデックスがない場合はundefined(falsy)
  // JSでは空配列は真と評価されることに注意
  const requiredCodeList = (await compulsoryDB)[
    grade === "one_grade" ? 0 : 1
  ]?.[classId];

  benchmark.log("* get requiredCodeList end *");

  // 有効な所属でない場合AA表示のみ
  if (!requiredCodeList) {
    AA.show();
    return;
  }

  // 有効な所属である場合に以下に進む
  // クラス -> データベースの参照の更新
  const filterByClass = (lecture) =>
    lecture[grade].some(
      (classID) => classID === classIdGeneral || classID === classId
    );
  await lectureDB.setSpecificator(filterByClass);
  lectureTable.update();

  // 必修入力部分
  if (registerCompulsory) {
    // 一旦登録授業をすべてリセット
    registration.clear();
    // リストにある講義を登録
    await registration.setByFilter(
      (lecture) => requiredCodeList.includes(lecture.code),
      true
    );
  }
  calendar.update();

  innerWindow.changeTo("main");

  // 永続化
  personal.save();

  benchmark.log("* table displayed *");
}

{
  const autofillCompulsoryButton = document.getElementById(
    "autofill-compulsory"
  );
  autofillCompulsoryButton.addEventListener("click", () => {
    validateStatusAndTransitWindow(true);
  });
  const closeStatusButton = document.getElementById("close-status");
  closeStatusButton.addEventListener("click", () => {
    validateStatusAndTransitWindow(false);
  });
}

// TODO: 各種ボタンを適切なモジュールのinitに割り振る
// 独立しているウィンドウ切り替え関連ボタンにイベントリスナーを設定
{
  const openStatusButton = document.getElementById("open-status");
  openStatusButton.addEventListener("click", () =>
    innerWindow.changeTo("status")
  );
  const settingsButton = document.getElementById("settings");
  settingsButton.addEventListener("click", () =>
    innerWindow.toggle("settings")
  );

  const resetAllButton = document.getElementById("reset-all");
  resetAllButton.addEventListener("click", () => {
    storageAccess.clear();
    hash.remove();
    location.reload();
  });
}

// 所属, 検索条件, 講義テーブル, カレンダー, 単位数, 講義詳細の初期化
const initAndRestore = () => {
  // 先に講義テーブルの中身を初期化する(講義登録時に参照するため)
  lectureTable.init();

  // localStorageの内容に合わせて状態を復元
  // 前回のデータが残っているかは所属情報の有無で判定
  if (personal.load()) {
    search.condition.load();
    search.textInput.load();
    calendar.load();
    registration.load();
    // 必修選択画面を飛ばす
    validateStatusAndTransitWindow(false);
  } else {
    search.condition.reset();
  }

  // hashに応じた講義詳細を表示
  detailViews.onHashChange();
};

initAndRestore();
