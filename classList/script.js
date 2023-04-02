let registeredLecturesList = [];
let registeredLecturesListForCredit = []; //単位計算＆表示用に同名の授業は1つだけ登録
const youbi = ["monday", "tuesday", "wednesday", "thursday", "friday"];

// 全講義のデータを取得する
async function getAllLectureList() {
  const allClassListUrl = './classList/data-beautified2023.json';
  const response = await fetch(allClassListUrl);
  const lecturedata = await response.json();
  return lecturedata;
};

// 単位数を計算し、表示に反映させる
function updateCreditsCount() {
  let sum = 0;
  for (const c of registeredLecturesListForCredit) {
    sum += Number(c.credits);
  }
  const counter = document.getElementById('counter');
  if (counter !== null) {
    counter.textContent = sum;
  }
}

// 同じ授業が登録されていないなら、登録リストに授業を入れる
function registerLectureToList(lectureObject) {
  if (!(registeredLecturesList.some(
      element => element.code === lectureObject.code
    ))){
    registeredLecturesList.push(lectureObject);
    if (!(registeredLecturesListForCredit.some(
      element => element.titleJp === lectureObject.titleJp
    ))) {
      registeredLecturesListForCredit.push(lectureObject);
    }
  }
}

class Lecture {
  constructor(object) {
    // object...授業オブジェクト

    this.schedule = object.periods; //[水１、木４]とか

    this.scheduleEnglish = this.schedule.map(scheduleJp => {
      const weekNameJp = scheduleJp.charAt(0);
      const time = scheduleJp.charAt(1);
      const weekNameJpToEn = {
        '月': 'monday',
        '火': 'tuesday',
        '水': 'wednesday',
        '木': 'thursday',
        '金': 'friday',
      };
      return weekNameJpToEn[weekNameJp] + time;
    });
    // 週間表のidを英語名にしているため、this.scheduleの英語名を作っておく。
    this.title = object.titleJp;
    this.code = object.code; //授業コード
    this.registerButton = document.getElementById(this.code.toString()); //授業登録ボタン
    if (this.registerButton.innerText === "登録") {
      this.registerButton.onclick = () => {
        registerLectureToList(this.data);
        this.register();
      }
    } else if (this.registerButton.innerText === "削除") {
      this.registerButton.onclick = () => {
        this.delete();
      }
    }
    this.data = object;
    this.data.scheduleEnglish = this.scheduleEnglish;
  }

  delete() {
    registeredLecturesList = registeredLecturesList.filter(l => l.code !== this.code);
    this.register();
    this.registerButton.style = "color:green;";
    this.registerButton.textContent = "登録";
    this.registerButton.onclick = () => {
      registerLectureToList(this.data);
      this.register();
    };
  }

  showDetail() {
    // その曜限の授業のシラバスを表示
  }

  closeDetail() {
    // とじる
  }

  register() {
    // こっちかも
    console.log('registering...');

    console.log("今登録されている授業は");
    console.log(registeredLecturesList);

    // カレンダーに授業を書き込む 
    for (const yougen of this.scheduleEnglish /*それぞれの曜限で*/) {
      const cell = new CalenderCell(yougen.slice(0, -1), yougen.at(-1));
      console.log(cell);
      cell.writeInCalender();
    }
    updateCreditsCount();
    this.registerButton.style = "color:red;"
    this.registerButton.textContent = "削除"
    this.registerButton.onclick = () => {this.delete()};
  }
}

// 講義情報のリストを受け取り、テーブルを返す
function setLectureTable(lectureList) {
  let html =
    '<tr><th width=60ch>曜限</th><th>科目名</th><th>教員</th><th>場所</th><th>授業コード</th><th>登録ボタン</th></tr>';
  for (const lesson of lectureList) {
    html += `<tr id=tr${lesson.code}>` +
      `<td id=yougen${lesson.code}>` +
      lesson.periods +
      `</td><td id=title${lesson.code}>` +
      lesson.titleJp +
      '</td><td>' +
      lesson.lecturerJp +
      '</td><td>' +
      lesson.classroom +
      '</td><td>' +
      lesson.code +
      '</td><td>' +
      `<button style="color: green"id=${lesson.code}>登録</button>` +
      '</td></tr>';
  }
  
  // 授業一覧
  document.getElementById('table').innerHTML = html;
  for (const lesson of lectureList) {
    new Lecture(lesson); // ついでにクラス作っちゃえ
  }
}


// 指定のクラスが存在しない場合、アスキーアートを挿入する関数
async function setAskiiArt(isValidClassId) {
  const div = document.getElementById("askiiArt");
  if (isValidClassId) {
    div.innerHTML = "";
  } else {
    const numberOfAskiiArts = 2;
    const randomNumber = Math.floor(Math.random() * (numberOfAskiiArts)) + 1;
    const response = await fetch(`./classList/error${randomNumber}.txt`);
    const askiiArt = await response.text();
    div.innerHTML = askiiArt;
    div.innerHTML += ["","<div>虚偽の情報を伝えることは、情報統合思念体としても、私個人としても望まれることではない。</div><div>---sleeping forever---</div>"][randomNumber - 1];
    // document.write("少し、頭冷やそうか。")
    // document.write("おイタしちゃだめにょろよ。")
  }
}

// 所属クラスから必修の授業を自動で登録するメソッド
async function registerHisshu(classId) {
  const urlForRequiredLectureCode = "./classList/requiredLecture2023.json";
  const response = await fetch(urlForRequiredLectureCode);
  const classToRequiredLectureCode = await response.json();
  const isValidClassId = classId in classToRequiredLectureCode;
  setAskiiArt(isValidClassId);
  if (isValidClassId) {
    const requiredLectureCodeList = classToRequiredLectureCode[classId];
    registeredLecturesList = [];
    registeredLecturesListForCredit = [];
    console.log(registeredLecturesList);
    const allLectureList = await getAllLectureList();
    /*console.log(requiredLectureCodeList);
    for (const day of youbi) {
      for (const num in (1, 7)) {
        const cell = new CalenderCell(youbi, num);
        console.log(cell);
        cell.element.innerHTML = `${cell.idJp}検索`
      }
    }*/
    //全部リセットしてくれ…
    for (const lecture of allLectureList.filter(
        lec => requiredLectureCodeList.includes(lec.code)
      )) {
      console.log(registeredLecturesList);
      registerLectureToList(lecture);
      const lectureObject = new Lecture(lecture);
      lectureObject.register();
    }
  }
}

// 分かりにくいかもしれない表示についてここで補足
// 1. 大半の表示は、"(1~2桁の建物番号)**"
// 2. ただし、"900" -> 講堂 となるので注意
// 3. "10-***" -> 10号館
// 4. "E**" -> 情報教育棟
// 5. "(West/East) K***" -> 21KOMCEE
// 6. "KALS" = 17号館2階
// 前のシステムのコードを借りました
function shortenedClassroom(text) {
  if (text.includes(",")) {
    return text.split(",").map(shortenedClassroom).join(",");
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
  return text;
}

// デフォルトの表示として、全講義をテーブルに載せる
(async () => {
  const allLectureList = await getAllLectureList();
  setLectureTable(allLectureList);
})();

// fetch(url)
//   .then((response) => response.json())
//   .then((data) => {
//     for (const lesson of data) {
//       const lecture = new Lecture(lesson);
//       console.log(lecture);
//       console.log(lecture.data);
//       lecture.registerButton.onclick = () => {
//         lecture.register();
//       };
//       //lecture.registerButton.onclick = lecture.registerは、thisが正しく認識されない。
//     }
//   });

const weekNameEnToJp = {
  'monday': '月',
  'tuesday': '火',
  'wednesday': '水',
  'thursday': '木',
  'friday': '金',
};

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
    this.element.setAttribute("class", "calender");
  }

  // 講義をカレンダーに書き込む
  writeInCalender() {
    this.element.innerHTML = `${this.idJp}検索`; // 一旦リセット
    console.log(this.idJp);
    let preLecture = "";
    for (
        const lecture of registeredLecturesList.filter(
          (lec) => (lec.periods.includes(this.idJp)) /*曜限が同じ授業だけ*/
        )
      ){
      console.log(this.element.innerHTML);
      if (this.element.innerHTML.includes('検索') /*まだその曜限に授業が入ってない*/) {
        this.element.innerHTML = lecture.titleJp;
      } else if (lecture.titleJp !== this.element.innerHTML && lecture.titleJp !== preLecture /*同名の授業は1つだけ表示*/) {
        this.element.innerHTML += "<br>" + lecture.titleJp;
      }
      preLecture = lecture.titleJp
    }
    if (this.element.innerHTML.includes('検索')) {
      this.element.setAttribute("class", "calender empty");
    } else {
      this.element.setAttribute("class", "calender registered");
    }
  }

  async search() {
    const lecturedata = await getAllLectureList();
      
    // 対象曜限の行にvisibleクラス、その他の行にinvisibleクラスを付与する
    // まずリセット
    // innerHTMLをいじって死にました。ぴえん。
  
    // 登録ボタンを復活させるため、再びクラス生成
    for (const lecture of lecturedata) {
      const tr = document.getElementById("tr" + lecture.code);
      tr.removeAttribute("class");
      if (lecture.periods.includes(this.idJp) /*検索したい曜限が入ってたら*/) {
        tr.setAttribute("class", "visible");
      } else {
        tr.setAttribute("class", "invisible");
      }
    }

    document.getElementById("when").textContent = `${this.idJp}の授業を検索中`
    
  }
}

// 曜限検索を発動
for (let i = 1; i <= 6; i++) {
  for (const week in weekNameEnToJp) {
    const cell = new CalenderCell(week, i);
    if (cell.element !== null) {
      cell.element.onclick = () => {
        console.log('search working!');
        cell.search();
      };       
    }
  }
}


const showButton = document.getElementById("show");
// formのvalueを受け取る
showButton.onclick = () => {
  const valueKarui = document.getElementById("selectKarui").value;
  const valueClassNumber = document.getElementById("classNumber").value;
  const classId = valueKarui + "_" + valueClassNumber;
  console.log(classId);
  registerHisshu(classId);
}
