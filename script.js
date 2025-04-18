"use strict";

/** @typedef {string} Code */
/** @typedef {string} Semester */
/** @typedef {string} Period */
/** @typedef {string} TitleJp */
/**
 * @typedef {Object} Lecture
 * @prop {Code} code
 * @prop {string} type
 * @prop {string} category
 * @prop {Semester} semester
 * @prop {Period[]} periods
 * @prop {string} classroom
 * @prop {TitleJp} titleJp
 * @prop {string} titleEn
 * @prop {string} lecturerJp
 * @prop {string} lecturerEn
 * @prop {string} ccCode 共通科目コード
 * @prop {number} credits
 * @prop {string} detail　講義詳細
 * @prop {string} schedule 講義計画
 * @prop {string} methods 講義方法
 * @prop {string} evaluation
 * @prop {string} notes 履修上の注意
 * @prop {string} class 履修可能クラス(日本語表記)
 * @prop {[string[], string[]]} importance 対象科類([必修, 推奨])
 * @prop {[string[], string[]]} targetClass 履修可能クラス([1年, 2年])
 * @prop {string} guidance
 * @prop {string} guidanceDate
 * @prop {string} guidancePeriod
 * @prop {string} guidancePlace
 * @prop {string} shortenedCategory
 * @prop {string} shortenedEvaluation
 * @prop {string} shortenedClassroom
 * @prop {number} time 授業時間
 * @prop {string} timeCompensation 授業時間90分の場合の対応
 * @prop {HTMLTableRowElement} tableRow
 */

/** DBのバージョン(年, セメスター)を表す文字列 */
const LAST_UPDATED = "2025S";
/**
 * 同セメスター内のバージョンを示す整数値.
 * DB関連の処理に互換性のない変更がある場合は加算し、セメスターが変わったら1に戻す.
 * あまり頻繁に更新するとユーザー体験を損なうので、些細な変更だったらそのままにしておく.
 * @type {number}
 */
const MINOR_VERSION = 1;

/**
 * ログを出力したい場合は適宜trueにすること.
 * テストが終わったらfalseに戻すこと.
 */
const IS_DEVELOPMENT = false;

/** moduleLike: ベンチマーク測定 */
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

/**
 * defaultdict from Python
 * @template K, V
 * @extends {Map<K, V>}
 */
class DefaultMap extends Map {
  /**
   * @param {[K, V][]?} entries
   * @param {(() => V)?} defaultfactory
   */
  constructor(entries, defaultfactory) {
    super(entries);
    this.defaultfactory = defaultfactory;
  }

  /** @param {K} key */
  get(key) {
    if (!this.has(key) && this.defaultfactory) {
      this.set(key, this.defaultfactory());
    }
    return super.get(key);
  }
}

/**
 * DefaultMap(titleJp, Map(code, lecture))
 * @extends {DefaultMap<TitleJp, Map<Code, Lecture>>}
 */
class LectureCounter extends DefaultMap {
  constructor() {
    super(null, () => new Map());
  }

  /**
   * 同種の講義かを識別するための講義名を取得する
   * @param {Lecture} lecture
   * @returns {TitleJp}
   */
  getName(lecture) {
    return lecture.titleJp.replace("(教員・教室未定)", "");
  }

  /**
   * 任意個数の講義を追加する
   * @param {...Lecture} lectures
   */
  push(...lectures) {
    for (const lecture of lectures) {
      this.get(this.getName(lecture)).set(lecture.code, lecture);
    }
    return this;
  }

  /**
   * 指定の講義を削除する. 返り値は削除に成功したか否か
   * @param {Lecture} lecture
   */
  delete(lecture) {
    benchmark.log("lecture delete start");
    const name = this.getName(lecture);
    const isSuccess = this.get(name).delete(lecture.code);
    if (!this.get(name).size) {
      super.delete(name);
    }
    benchmark.log(`lecture ${name} deleted`);
    return isSuccess;
  }

  /**
   * 指定の講義が存在するかを返す
   * @param {Lecture} lecture
   * @returns {boolean}
   */
  hasLecture(lecture) {
    return this.get(this.getName(lecture))?.has?.(lecture.code) ?? false;
  }
}

/** LectureNameCounterに曜限ごとの管理機能を追加したもの */
class LectureCounterPeriodScope extends LectureCounter {
  constructor() {
    super();
    /** @type {DefaultMap<Period, LectureCounter>} */
    this.byPeriod = new DefaultMap(null, () => new LectureCounter());
  }

  /** 講義の登録状況をリセットする */
  clear() {
    this.byPeriod.clear();
    super.clear();
  }

  /** @param {...Lecture} lectures */
  push(...lectures) {
    for (const lecture of lectures) {
      for (const period of lecture.periods) {
        this.byPeriod.get(period).push(lecture);
      }
    }
    return super.push(...lectures);
  }

  /** @param {Lecture} lecture */
  delete(lecture) {
    for (const period of lecture.periods) {
      this.byPeriod.get(period).delete(lecture);
    }
    return super.delete(lecture);
  }

  /** 登録されている全講義のうち、名前の異なるものの総単位数 */
  get credits() {
    // 講義名ごとに講義を1つ取り出して単位数を加算していく
    let sum = 0;
    for (const codeToLecture of this.values()) {
      sum += Number([...codeToLecture.values()][0].credits);
    }
    return sum;
  }
}

/** セメスターごとにLectureNameCounterを管理できるようにしたもの */
class LectureCounterSemesterScope {
  /** @param {...Semester} semesters */
  constructor(...semesters) {
    this.counters = new Map(
      semesters.map((semester) => [semester, new LectureCounterPeriodScope()])
    );
  }

  /**
   * 登録されている全講義とそのコード
   * @returns {IterableIterator<[Code, Lecture]>}
   */
  *[Symbol.iterator]() {
    for (const counterPeriodScope of this.counters.values()) {
      for (const codeToLecture of counterPeriodScope.values()) {
        yield* codeToLecture;
      }
    }
  }

  /**
   * 登録されている全講義のコード
   * @returns {IterableIterator<Code>}
   */
  *keys() {
    for (const [key, _] of this) {
      yield key;
    }
  }

  /**
   * 登録されている全講義
   * @returns {IterableIterator<Lecture>}
   */
  *values() {
    for (const [_, value] of this) {
      yield value;
    }
  }

  /** 講義の登録状況をリセットする */
  clear() {
    for (const counter of this.counters.values()) {
      counter.clear();
    }
  }

  /**
   * 任意個数の講義を追加する
   * @param {...Lecture} lectures
   */
  push(...lectures) {
    for (const lecture of lectures) {
      this.counters.get(lecture.semester[0]).push(lecture);
    }
    return this;
  }

  /**
   * 指定の講義を削除する. 返り値は削除に成功したか否か
   * @param {Lecture} lecture
   */
  delete(lecture) {
    return this.counters.get(lecture.semester[0]).delete(lecture);
  }

  /**
   * 指定の講義が存在するかを返す
   * @param {Lecture} lecture
   * @returns {boolean}
   */
  has(lecture) {
    return [...this.counters.values()].some((counter) =>
      counter.hasLecture(lecture)
    );
  }

  /** 登録されている全講義のうち、名前の異なるものの総単位数 */
  get credits() {
    let sum = 0;
    for (const counterPeriodScope of this.counters.values()) {
      sum += counterPeriodScope.credits;
    }
    return sum;
  }

  /**
   * Map(semester, LectureCounter)
   * @param {Period} period
   * @returns {Map<Semester, LectureCounter>}
   */
  periodOf(period) {
    return new Map(
      [...this.counters].map(([semester, counterPeriodScope]) => [
        semester,
        counterPeriodScope.byPeriod.get(period),
      ])
    );
  }
}

/**
 * @typedef {string | Array | Object} savable
 * string, Array, Objectから再帰的に構成される型
 */
/**
 * moduleLike: localStorage
 * - 保存可能なデータ: 上記参照
 * - DB類を入れるためにLZStringで圧縮している
 */
const storageAccess = {
  /**
   * @param {string} key
   * @param {savable} value
   */
  setItem: (key, value) =>
    localStorage.setItem(key, LZString.compressToBase64(JSON.stringify(value))),
  /**
   * @param {string} key
   * @returns {savable?}
   */
  getItem: (key) =>
    JSON.parse(
      LZString.decompressFromBase64(localStorage.getItem(key)) || "null"
    ),
  clear: () => localStorage.clear(),
};
// メジャーバージョンが変わった際はキャッシュを削除しリロードする
if (
  !(
    storageAccess.getItem("LAST_UPDATED") === LAST_UPDATED &&
    storageAccess.getItem("MINOR_VERSION") === MINOR_VERSION
  )
) {
  storageAccess.clear();
  storageAccess.setItem("LAST_UPDATED", LAST_UPDATED);
  storageAccess.setItem("MINOR_VERSION", MINOR_VERSION);
  location.reload();
}

/** moduleLike: アクティブウィンドウ切り替え */
const innerWindow = {
  init() {
    const startButton = document.getElementById("start");
    startButton.addEventListener("click", () => {
      this.changeTo("status");
      personal.validateStatus();
    });
    const openStatusButton = document.getElementById("open-status");
    openStatusButton.addEventListener("click", () => this.changeTo("status"));
    const settingsButton = document.getElementById("settings");
    settingsButton.addEventListener("click", () => this.toggle("settings"));
    this.changeTo("load");
  },
  coveredElements: [
    document.getElementById("toggle-mode"),
    document.getElementById("scroll-to-search"),
  ],
  coveredBaseElements: [
    document.getElementById("global-header"),
    document.getElementById("global-footer"),
  ],
  index: new Map([
    ["load", document.getElementById("loading-message")],
    ["title", document.getElementById("title-window")],
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
    return null;
  },
  changeTo(/** @type {string} */ windowName) {
    for (const [targetWindowName, targetWindow] of this.index) {
      const isTarget = windowName === targetWindowName;
      targetWindow.hidden = !isTarget;
      if (isTarget) {
        for (const element of this.coveredElements) {
          element.hidden = targetWindow.classList.contains("fullscreen-window");
        }
        for (const element of this.coveredBaseElements) {
          element.hidden = targetWindow.classList.contains(
            "over-fullscreen-window"
          );
        }
      }
    }
  },
  toggle(/** @type {string} */ primaryWindowName) {
    this.changeTo(
      this.activeWindowName !== primaryWindowName ? primaryWindowName : "main"
    );
  },
};
innerWindow.init();

/** moduleLike: ハッシュ操作関連 */
const hash = {
  _get() {
    return (
      location.hash.match(/^#\/(view|edit)\/(\d*)\/?$/)?.slice?.(1, 3) ?? [
        "edit",
        null,
      ]
    );
  },
  _set(mode, code) {
    location.hash = `#/${mode ?? this._get()[0]}/${code ?? ""}`;
  },
  /** @type {"view" | "edit"} */
  get mode() {
    return this._get()[0];
  },
  set mode(mode) {
    if (this.mode !== mode) {
      this._set(mode, null);
      if (this.browser === "firefox") {
        location.reload();
      } else if (mode === "edit") {
        window.scrollTo(0, this.scroll);
      }
    }
  },
  get code() {
    return this._get()[1];
  },
  set code(code) {
    this._set(null, code);
  },
  remove() {
    this._set(null, null);
  },
  panel: document.getElementById("toggle-mode"),
  scroll: 0,
  /** @type {"ie" | "edge" | "chrome" | "safari" | "firefox" | "other"} */
  browser: (() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes("msie") || userAgent.includes("trident")) {
      return "ie";
    } else if (userAgent.includes("edg")) {
      return "edge";
    } else if (userAgent.includes("chrome")) {
      return "chrome";
    } else if (userAgent.includes("safari")) {
      return "safari";
    } else if (userAgent.includes("firefox")) {
      return "firefox";
    } else {
      return "other";
    }
  })(),
  init() {
    document.getElementById(this.mode).checked = true;
    this.panel.addEventListener("change", (ev) => {
      this.mode = ev.target.id;
    });
    window.addEventListener("load", () => {
      this.scroll = window.scrollY;
    });
    switch (this.browser) {
      case "edge":
      case "chrome":
        window.addEventListener("scrollend", () => {
          if (this.mode === "edit") {
            this.scroll = window.scrollY;
          }
        });
        break;
      case "safari":
      case "ie":
      case "other":
        window.addEventListener("scroll", () => {
          setTimeout(() => {
            if (this.mode === "edit") {
              this.scroll = window.scrollY;
            }
          }, 100);
        });
        break;
      case "firefox":
        break;
    }
  },
  alert() {
    switch (this.browser) {
      case "edge":
      case "chrome":
        break;
      case "safari":
      case "firefox":
      case "other":
        window.alert(
          "本サイトの閲覧には、ChromeまたはEdgeを推奨しています。\nそれ以外のブラウザでは、モード切り替え時にスクロールが保持されず、ユーザーエクスペリエンスを損なう可能性があります。"
        );
        break;
      case "ie":
        window.alert(
          "本サイトはInternet Explorerをサポートしていません。\n本サイトの閲覧には、ChromeまたはEdgeを推奨しています。"
        );
        break;
    }
  },
};
hash.init();

/** moduleLike: 文字列処理 */
const textUtils = {
  /**
   * - テキストの全角英数字, 全角スペース, 空文字を除去する
   * - 分かりにくいが、3つ目のreplaceの"～"は全角チルダであり、波ダッシュではない
   * - 小文字にはしないので検索時は別途toLowerCase()すること
   * @param {string} text
   */
  normalize: (text) =>
    (text ?? "")
      .replace(/([^\S\n]|　)+/g, " ")
      .replace(/[，．]/g, "$& ")
      .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
      .replace(/[‐―−ｰ]/g, "-")
      .replaceAll("〜", "~")
      .trim(),
  /** @param {string} text */
  toSearch: (text) =>
    (text ?? "")
      .toLowerCase()
      .replaceAll("ー", "-")
      .replaceAll("、", ",")
      .replaceAll("。", "."),
};

/**
 * moduleLike: データベース
 * - callback: lectureTable
 */
const lectureDB = {
  async init() {
    this.availableCheckbox.addEventListener("click", () =>
      lectureTable.update()
    );
  },
  /** @type {Promise<Lecture[]>} */
  whole: (async () => {
    benchmark.log("* DB init start *");

    // キャッシュがあるなら参照する
    const loadedLectureList = storageAccess.getItem("lectureDB");
    if (loadedLectureList) {
      benchmark.log("* load DB from cache *");
      return loadedLectureList;
    }

    benchmark.log("* DB process start *");

    /** @type {Lecture[]} */
    const allLectureList = await (
      await fetch(`./classList/processed${LAST_UPDATED}.json`)
    ).json();

    benchmark.log("* DB init end *");

    // setTimeoutしても、結局メインの動作は止まる
    storageAccess.setItem("lectureDB", allLectureList);

    benchmark.log("* DB cached *");

    return allLectureList;
  })(),
  get reference() {
    return this.availableCheckbox.checked ? this.specified : this.whole;
  },
  /** @type {Lecture[]} */
  specified: undefined,
  availableCheckbox: document.getElementById("available-only"),
  /** @param {(lecture: Lecture) => boolean} filter */
  async setSpecificator(filter) {
    this.specified = (await this.whole).filter(filter);
  },
};
lectureDB.init();

/** moduleLike: 講義詳細 */
const detailViews = {
  init() {
    const removeDetailButton = document.getElementById("detail-remove");
    removeDetailButton.addEventListener("click", () => hash.remove());
    this.overlay.addEventListener("click", () => hash.remove());
    window.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        hash.remove();
      }
    });

    window.addEventListener("hashchange", () => void this.onHashChange());
  },
  async onHashChange() {
    const code = hash.code;
    const lecture = code
      ? (await lectureDB.whole).find((l) => l.code === code)
      : null;
    if (lecture) {
      document.title = `${lecture.titleJp} - シ楽バス`;
      this.window.hidden = false;
      this.overlay.hidden = false;
      this.update(lecture);
    } else {
      document.title = "シ楽バス - 履修登録支援システム";
      this.window.hidden = true;
      this.overlay.hidden = true;
    }
  },
  checkbox: document.getElementById("detail-checkbox"),
  class: document.getElementById("detail-class"),
  classroom: document.getElementById("detail-classroom"),
  code: document.getElementById("detail-code"),
  detail: document.getElementById("detail-detail"),
  evaluation: document.getElementById("detail-evaluation"),
  guidance: document.getElementById("detail-guidance"),
  label: document.getElementById("detail-label"),
  lecturer: document.getElementById("detail-lecturer"),
  methods: document.getElementById("detail-methods"),
  notes: document.getElementById("detail-notes"),
  period: document.getElementById("detail-period"),
  schedule: document.getElementById("detail-schedule"),
  time: document.getElementById("detail-time"),
  title: document.getElementById("detail-title"),
  type: document.getElementById("detail-type"),
  window: document.getElementById("detail-window"),
  content: document.getElementById("detail-content"),
  overlay: document.getElementById("overlay"),
  /** @param  {...string} contents */
  join: (...contents) => contents.join(" / "),
  /**
   * @param {RegExp} regexp
   * @returns {(...contents: string[]) => string}
   */
  getJoiner: (regexp) => {
    /** @type {(text: string) => string} */
    const mark =
      regexp.source === "(?:)"
        ? (text) => text
        : (text) => text.replace(regexp, "<mark>$&</mark>");
    return (...contents) =>
      contents
        .map((text) =>
          text
            ? mark(text)
                .replace(/<(?!\/?mark>)/g, "&lt;")
                .replace(/(?<!<\/?mark)>/g, "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("\n", "<br>")
            : ""
        )
        .join(" / ")
        .replace(/(?: \/ ){1,4}$/, "");
  },
  /** @param {Lecture} lecture */
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
      "ig"
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
    this.guidance.innerHTML = (() => {
      switch (lecture.guidance) {
        case "初回":
        case "別日":
          const text = joinWithHighlight(
            ...[
              lecture.guidance,
              [
                lecture.guidanceDate
                  .replace(/[年月]/g, "/")
                  .replace(/[ 日]/g, ""),
                lecture.guidancePeriod &&
                  `${Number(lecture.guidancePeriod.slice(0, 1)) || "他曜"}限`,
              ]
                .filter((v) => v)
                .join(" "),
              lecture.guidancePlace,
            ].filter((v) => v)
          );
          return text.length === 2 ? `${text}に行う` : text;
        case "なし":
          return "実施しない";
        default:
          return "";
      }
    })();
    this.notes.innerHTML = joinWithHighlight(lecture.notes);
    this.schedule.innerHTML = joinWithHighlight(lecture.schedule);
    this.code.innerHTML = joinWithHighlight(lecture.code, lecture.ccCode);
    this.time.innerHTML = joinWithHighlight(
      `${lecture.time}分`,
      lecture.timeCompensation
    );
    // ボタン部分
    const checkboxId = `checkbox-${lecture.code}`;
    this.label.htmlFor = checkboxId;
    this.checkbox.checked = document.getElementById(checkboxId).checked;
    // スクロール位置
    this.content.scrollTo(0, 0);
  },
};
detailViews.init();

/** moduleLike: 曜限計算 */
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
  dayToday: new Intl.DateTimeFormat("en-US", { weekday: "long" })
    .format(new Date())
    .toLowerCase(),
  /** @type {Map<string, Period[]>} */
  headerIdToPeriods: new Map(),
  /** @type {Map<Period, string>} */
  periodToId: new Map(),
};
periodsUtils.init();

/**
 * moduleLike: 登録講義
 * - 依存先: storageAccess, lectureDB, periodsUtils
 * - TODO: 必修か+自クラス対象かの4通りで文字色を変える
 */
const registration = {
  /** 単位計算&表示用の名前ごとのカウンタ */
  lectureCounter: new LectureCounterSemesterScope("S", "A"),
  /**
   * 講義が登録されているかを返す
   * @param {Lecture} lecture
   * @returns {boolean}
   */
  has(lecture) {
    return this.lectureCounter.has(lecture);
  },
  /**
   * 講義を登録する
   * @param {Lecture} lecture
   */
  add(lecture) {
    this.lectureCounter.push(lecture);
    this.save();
  },
  /**
   * 登録リストから講義を削除する
   * @param {Lecture} lecture
   */
  delete(lecture) {
    this.lectureCounter.delete(lecture);
    this.save();
  },
  /** 登録リストを初期化する */
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
  /**
   * 登録ボタン以外から複数講義を登録する
   * @param {(lecture: Lecture) => boolean} lectureFilter
   * @param {boolean} isSpecified
   */
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
  creditDisplay: document.getElementById("credit-counter"),
  /** 単位数を計算し、表示に反映させる */
  updateCreditsCount() {
    this.creditDisplay.textContent = this.lectureCounter.credits;
  },
};

// calendar, search
// 子要素の変更に対応して講義テーブルを更新する
const updateByClick = (ev) => {
  const target = ev.target;
  switch (target?.tagName) {
    case "LABEL":
    case "BUTTON":
      // 子要素に登録済講義表示ボタンがないことを確認すること
      search.showSearchedButton.checked = true;
      // clickイベントを検出しているため、setTimeoutの中に入れる(inputのchangeを待つ)必要がある
      setTimeout(() => lectureTable.update(), 0);
  }
};

/**
 * moduleLike: カレンダー
 * - 依存先: periodsUtils, registration
 * - callback: search, lectureTable
 * - 機能: 登録講義の表示, 検索機能の呼び出し, 検索対象の曜限を保持
 */
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
      if (id.includes(periodsUtils.dayToday)) {
        this.todayHeader = header;
      }
    }
  },
  /** @type {HTMLElement?} */
  todayHeader: null,
  // TODO: HTML構成部分切り出し?
  /** @type {Map<Period, HTMLElement>} */
  periodToElement: (() => {
    // 子要素の変更に対応して講義テーブルを更新する
    const calendarContainer = document.getElementById("calendar-container");
    calendarContainer.addEventListener("click", updateByClick);

    // ここで要素を構成する
    const createTh = (dayEn, time, text) => {
      const th = document.createElement("th");
      const button = document.createElement("button");
      button.id = `${dayEn}-${time}`;
      button.textContent = text;
      th.append(button);
      if (dayEn === periodsUtils.dayToday) {
        button.className = "today-button";
      }

      return th;
    };
    const createTd = (dayEn, time) => {
      const id = `${dayEn}-${time}`;
      const cid = `c-${id}`;

      const td = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = cid;
      checkbox.hidden = true;
      const label = document.createElement("label");
      label.htmlFor = cid;
      label.id = id;
      if (dayEn === periodsUtils.dayToday) {
        label.className = "today-label";
      }
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
        tr.append(createTd(dayEn, time));
      }
    }
    // 集中
    const tr = document.createElement("tr");
    timeTableBody.append(tr);
    tr.append(createTh("intensive", "all", "集"));
    const td = createTd("intensive", 0);
    td.colSpan = 5;
    tr.append(td);

    const periodToElement = new Map(
      [...periodsUtils.periodToId].map(([period, id]) => [
        period,
        document.getElementById(id),
      ])
    );
    // 基礎生命科学実験αが"集中6"なのでその対応
    periodToElement.set("集中6", periodToElement.get("集中"));
    return periodToElement;
  })(),

  // 以下、registrationの表示機能
  /**
   * カレンダーの指定曜限の表示を更新する(単位数も)
   * @param {Period[]} periods
   */
  update(periods) {
    benchmark.log("calendar update start");
    registration.updateCreditsCount();
    benchmark.log("credit displayed");
    const { stream } = personal.get();
    for (const period of periods ?? this.periodToElement.keys()) {
      const element = this.periodToElement.get(period);
      element.textContent = "";
      for (const [semester, counter] of registration.lectureCounter.periodOf(
        period
      )) {
        for (const [name, codeToLecture] of counter) {
          const num = codeToLecture.size;
          const code = [...codeToLecture.keys()][0];
          const lectureBox = document.createElement("button");
          lectureBox.className = "lecture-box";
          lectureBox.textContent = `${name}${num === 1 ? "" : ` (${num})`}`;
          lectureBox.tabIndex = -1;
          lectureBox.addEventListener("click", () => {
            if (num !== 1) {
              window.alert(
                "複数の同名講義が登録されているため、その1つを表示します"
              );
            }
            hash.code = code;
          });

          // 絶対取らなあかん科目を赤、取ると履修が捗る科目を青にする。
          const importance = [...codeToLecture.values()][0].importance.map(
            (l) => l.includes(stream)
          );
          if (importance[0]) {
            lectureBox.classList.add("required");
          } else if (importance[1]) {
            lectureBox.classList.add("recommended");
          }

          element.appendChild(lectureBox);
          benchmark.log("calendar update end");
        }
      }
    }
  },

  // 以下、searchのフィルタ機能
  /**
   * search用にオブジェクトに変換
   * @type {Object.<string, boolean>}
   */
  get index() {
    return Object.fromEntries(
      [...this.periodToElement].map(([period, element]) => [
        period,
        element.control.checked,
      ])
    );
  },
  /**
   * 指定の曜限のみチェックが入っている状態にする
   * @param {Period[]} periods
   */
  set(periods) {
    for (const [period, element] of this.periodToElement) {
      const setTo = periods.includes(period);
      element.control.checked = setTo;
    }
  },
  /** 空きコマのみ選択 */
  selectBlank() {
    for (const [period, element] of this.periodToElement) {
      const setTo = !element.hasChildNodes() && period !== "集中";
      element.control.checked = setTo;
    }
  },
  /**
   * 指定の曜限のチェック状態を入れ替える
   * @param {Period[]} periods
   */
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

/**
 * moduleLike: 検索機能
 * - init-callback: lectureTable
 * - 依存先: storageAccess, registration, calendar
 */
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
    this.textInput.freewordTextBox.addEventListener("input", () => {
      lectureTable.update();
    });
    const tableContainer = document.getElementById("view-table-container");
    this.textInput.freewordTextBox.addEventListener("keydown", (ev) => {
      // IME変換中でないEnterでのみイベントを発火させる
      if (!(ev.key === "Enter" && !ev.isComposing)) {
        return;
      }
      ev.preventDefault();
      // 検索結果が単一の場合、直接講義詳細に遷移する
      if (this.jumpTo) {
        hash.code = this.jumpTo;
        this.textInput.freewordTextBox.blur();
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

    const displayRibbonWrapper = document.getElementById(
      "display-ribbon-wrapper"
    );
    displayRibbonWrapper.addEventListener("change", () =>
      lectureTable.update()
    );

    // フィルタ表示初期化
    this.condition.init();
  },
  condition: {
    init() {
      const getDisplayName = (name) =>
        this.nameTable[name].replace(/総合|登録/g, "");
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
        label.textContent = getDisplayName(name);

        const wrapper = document.createElement("div");
        wrapper.className = "accordion-child";
        wrapper.append(checkbox, label);

        this.toElement.get(category).set(name, checkbox);
        return wrapper;
      };
      const generateTernaryButton = (category, name) => {
        const wrapper = document.createDocumentFragment();
        const header = document.createElement("div");
        header.textContent = getDisplayName(name);
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
        checkboxList.forEach((element, index, array) => {
          element.addEventListener("click", function () {
            if (this.checked) {
              array[1 - index].checked = false;
            }
          });
        });

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
    /** {category || option: string} */
    nameTable: {
      semester: "学期",
      S_: "S",
      S1: "S1",
      S2: "S2",
      A_: "A",
      A1: "A1",
      A2: "A2",

      evaluation: "評価",
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
    /**
     * Map(category, Map(option, element))
     * @type {Map<string, Map<string, HTMLInputElement | [HTMLInputElement, HTMLInputElement]>>}
     */
    toElement: new Map([
      [
        "semester",
        new Map([
          ["S_", null],
          ["S1", null],
          ["S2", null],
          ["A_", null],
          ["A1", null],
          ["A2", null],
        ]),
      ],
      [
        "evaluation",
        new Map([
          ["exam", null],
          ["paper", null],
          ["attendance", null],
          ["participation", null],
        ]),
      ],
      [
        "category",
        new Map([
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
        ]),
      ],
      [
        "registration",
        new Map([
          ["unregistered", null],
          ["registered", null],
        ]),
      ],
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
            isActive = element[0].checked
              ? true
              : element[1].checked
              ? false
              : null;
          } else {
            isActive = element.checked;
          }
          options.push([option, isActive]);
        }
      }
      return index;
    },
    /**
     * 単一のフィルタに値をセットする
     * @param {string} category
     * @param {string} option
     * @param {boolean | (category: string, option: string) => boolean} isActive
     */
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
    /**
     * 複数のフィルタに一括で値をセットする
     * @param {Object.<string, [string, boolean][]> | (category: string, option: string) => boolean} indexOrFilter
     * @returns
     */
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
        for (const [category, optionAndIsActive] of Object.entries(
          indexOrFilter
        )) {
          for (const [option, isActive] of optionAndIsActive) {
            this._set(category, option, isActive);
          }
        }
      }
    },
    /** フィルタを初期状態に戻す */
    reset() {
      this.set((category, option) =>
        category === "evaluation"
          ? null
          : category === "semester"
          ? option.includes(LAST_UPDATED.slice(-1))
          : category !== "category" ||
            ["A", "B", "C", "D", "E", "F"].includes(option) ||
            (personal.get().stream.includes("l") && option === "L")
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
    /** @type {[string[], string[]]} */
    get keywords() {
      const keywordsPositive = [];
      const keywordsNegative = [];
      for (const keyword of textUtils
        .toSearch(textUtils.normalize(this.freewordTextBox.value))
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
  /** @type {(lecture: Lecture) => boolean} */
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
    const skipEvaluationMust = evaluationCondition.every(([k, v]) => !v);
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
          "category",
          "guidance",
        ]
      : ["titleJp", "titleEn"];
    return (/** @type {Lecture} */ lecture) =>
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
          ([k, v]) => v && lecture.shortenedEvaluation.includes(nameTable[k])
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
  /**
   * 講義詳細に直接遷移するための時間割コード
   * @type {string?}
   */
  jumpTo: null,
  async getResult() {
    const result = this.showSearchedButton.checked
      ? (await lectureDB.reference).filter(this.nonRegisteredFilter)
      : (await lectureDB.whole).filter((lecture) => registration.has(lecture));
    this.jumpTo = result.length === 1 ? result[0].code : null;
    return result;
  },
  /** 検索結果表示ボタン */
  showSearchedButton: document.getElementById("searched"),
  /** ラベル(検索結果) */
  searchedLabel: document.getElementById("searched-label"),
  /** ラベル(登録講義) */
  registeredLabel: document.getElementById("registered-label"),
  /** 検索件数表示用ボックス */
  statusBox: document.getElementById("search-status"),
  /** @param {string} message */
  showStatus(message) {
    this.statusBox.textContent = message;
    (search.showSearchedButton.checked
      ? search.searchedLabel
      : search.registeredLabel
    ).insertAdjacentElement("beforeend", this.statusBox);
  },
};
search.init();

/**
 * moduleLike: 講義テーブル
 * - 依存先: lectureDB, search
 */
const lectureTable = {
  async init() {
    /**
     * 講義テーブル用の登録ボタンを生成する
     * @param {Lecture} lecture
     */
    const generateRegisterButton = (lecture) => {
      const tdOfButton = document.createElement("td");
      tdOfButton.className = "registration-col";

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

      // バブリング防止(これがないと登録ボタンクリックで詳細が開いてしまう)
      checkbox.addEventListener("click", (ev) => {
        ev.stopPropagation();
      });
      label.addEventListener("click", (ev) => {
        ev.stopPropagation();
      });

      tdOfButton.append(checkbox, label);

      return tdOfButton;
    };
    /**
     * 講義情報からテーブルの行(ボタン含む)を生成する
     * @param {Lecture} lecture
     */
    const generateRow = (lecture) => {
      const tr = document.createElement("tr");
      tr.insertAdjacentHTML(
        "afterbegin",
        `
<td class="info-col">
  <div class="title-col">${lecture.titleJp}</div>
  <div class="detail-col">
    <span>曜限：${lecture.semester} - ${lecture.periods.join("")}</span>
    <span>種別：${lecture.shortenedCategory}</span>
    <span>${lecture.credits}単位</span>
    <span>教室：${lecture.shortenedClassroom}</span>
    <span>教員：${lecture.lecturerJp}</span>
    <span>評価：${lecture.shortenedEvaluation || "詳細画面に記載"}</span>
  </div>
</td>
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

    innerWindow.changeTo("title");
  },
  body: document.getElementById("search-result").lastElementChild,
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
    search.showStatus(`: ${lecturesToDisplay.length}件`);
    // 永続化
    search.condition.save();
    calendar.save();
  },
};

// TODO: 以下の必修関連をまとめる?

/**
 * moduleLike: AA表示
 * 初期化は遅延されている
 */
const AA = {
  async show() {
    if (!this.DB) {
      this.pattern = 6;
      this.DB = Promise.all(
        Array(this.pattern)
          .fill(0)
          .map(async (_, i) =>
            (await fetch(`./errorMessage/error${i + 1}.txt`)).text()
          )
      );
      this.drawBox = document.getElementById("askii-art");
      const deleteAAButton = document.getElementById("delete-aa");
      deleteAAButton.addEventListener("click", () =>
        innerWindow.changeTo("status")
      );
    }
    const randomIndex = Math.floor(Math.random() * this.pattern);
    this.drawBox.innerText = (await this.DB)[randomIndex];
    innerWindow.changeTo("askiiArt");
  },
};

/** @typedef {{stream: string, classNumber: number, grade: number}} PersonalStatus */
/** moduleLike: 所属情報 */
const personal = {
  init() {
    this.closeStatusButton.addEventListener("click", () => {
      validateAndInitWindow(false);
    });
    this.classNumber.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        this.autofillCompulsoryCheck.focus();
      }
    });
    const personalForm = document.getElementById("personal-status");
    personalForm.addEventListener("change", () => this.validateStatus());
    personalForm.addEventListener("keydown", () => this.validateStatus());
    personalForm.addEventListener("input", () => this.validateStatus());
  },
  /** @type {HTMLSelectElement} */
  stream: document.getElementById("compulsory"),
  /** @type {HTMLSelectElement} */
  grade: document.getElementById("grade"),
  /** @type {HTMLInputElement} */
  classNumber: document.getElementById("class-number"),
  /** @type {HTMLInputElement} */
  autofillCompulsoryCheck: document.getElementById("autofill-compulsory"),
  /** @type {HTMLButtonElement} */
  closeStatusButton: document.getElementById("close-status"),
  isValid() {
    const personalStatus = this.get();
    /** @type {number} */
    let maxClassNum;
    switch (personalStatus.stream) {
      case "l1":
      case "l2":
        maxClassNum = 28;
        break;
      case "l3":
        maxClassNum = 20;
        break;
      case "s1":
        maxClassNum = 39;
        break;
      case "s2":
      case "s3":
        maxClassNum = 24;
        break;
      default:
        maxClassNum = 0;
        break;
    }
    return (
      (personalStatus.stream !== "default" &&
        personalStatus.grade !== "default" &&
        personalStatus.classNumber === Math.floor(personalStatus.classNumber) &&
        personalStatus.classNumber >= 1 &&
        personalStatus.classNumber <= maxClassNum) ||
      personalStatus.classNumber >= 100
    );
  },
  validateStatus() {
    this.closeStatusButton.disabled = !this.isValid();
  },
  /** @returns {PersonalStatus} */
  get() {
    return {
      stream: this.stream.value,
      classNumber: Number(this.classNumber.value),
      grade: Number(this.grade.value),
    };
  },
  /** @param {PersonalStatus} personalStatus */
  set(personalStatus) {
    this.stream.value = personalStatus.stream;
    this.classNumber.value = personalStatus.classNumber.toString();
    this.grade.value = personalStatus.grade.toString();
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

/**
 * Promise([1年必修の一覧, 2年必修の一覧])
 * @type {Promise<[Object.<string, string[] | undefined>]>}
 */
const compulsoryDB = (async () => {
  benchmark.log("* compulsory init start *");

  const loadedCompulsoryDB = storageAccess.getItem("compulsoryDB");
  if (loadedCompulsoryDB) {
    benchmark.log("* load compulsory from cache *");

    return loadedCompulsoryDB;
  }
  const compulsoryDB = await (
    await fetch(`./classList/required${LAST_UPDATED}.json`)
  ).json();

  setTimeout(async () => {
    storageAccess.setItem("compulsoryDB", compulsoryDB);
    benchmark.log("* compulsory cached *");
  }, 0);

  return compulsoryDB;
})();

/**
 * 所属クラスからDB更新+必修自動登録+画面遷移
 * 1. 所属の有効判定(保存)
 * 2. AA更新
 * 3. 参照DB更新
 * 4. テーブル更新
 * 5. 必修自動入力
 * 6. カレンダー更新
 * 7. 画面遷移
 * @param {boolean} skipCompulsory
 */
async function validateAndInitWindow(skipCompulsory) {
  // 情報を取得
  const personalStatus = personal.get();
  const { stream, classNumber, grade } = personalStatus;
  const classId = `${stream}_${classNumber}`;
  const classIdGeneral = `${stream}_all`;

  benchmark.log("* get requiredCodeList start *");

  // 必修のコードの配列. 必修がない場合は空リスト(truthy), DBにインデックスがない場合はundefined(falsy)
  // JSでは空配列は真と評価されることに注意
  const requiredCodeList = (await compulsoryDB)[grade - 1]?.[classId];

  benchmark.log("* get requiredCodeList end *");

  // 有効な所属でない場合AA表示のみ
  if (!requiredCodeList) {
    AA.show();
    return;
  }

  // 有効な所属である場合に以下に進む
  // クラス -> データベースの参照の更新
  /**
   * @param {Lecture} lecture
   * @returns {boolean}
   */
  const filterByClass = (lecture) =>
    lecture.targetClass[grade - 1].some(
      (/** @type {string} */ classID) =>
        classID === classIdGeneral || classID === classId
    );
  await lectureDB.setSpecificator(filterByClass);
  lectureTable.update();

  // 必修入力部分
  if (!skipCompulsory && personal.autofillCompulsoryCheck.checked) {
    // 一旦登録講義をすべてリセット
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

  // 今日の曜日の列をスクロールで表示領域に持ってくる
  calendar.todayHeader?.scrollIntoView?.({
    behavior: "instant",
    block: "nearest",
    inline: "center",
  });
}

// TODO: 各種ボタンを適切なモジュールのinitに割り振る
// 独立しているウィンドウ切り替え関連ボタンにイベントリスナーを設定
{
  const resetAllButton = document.getElementById("reset-all");
  resetAllButton.addEventListener("click", () => {
    storageAccess.clear();
    hash.remove();
    location.reload();
  });
}

/** 所属, 検索条件, 講義テーブル, カレンダー, 単位数, 講義詳細の初期化 */
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
    validateAndInitWindow(true);
  } else {
    search.condition.reset();
    hash.alert();
  }

  // hashに応じた講義詳細を表示
  detailViews.onHashChange();
};

initAndRestore();
