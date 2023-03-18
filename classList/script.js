const url = './classList/data-beautified.json';
const result = document.getElementById('table'); //授業一覧
let registoredLecturesList = [];
function countCredits() {
  //単位数計算
  let sum = 0;
  for (const c of registoredLecturesList) {
    sum += Number(c.credits);
  }
  const counter = document.getElementById('counter');
  if (counter !== null) {
    counter.textContent = sum;
  }
}
//登録した・必修の授業オブジェクトを格納した配列
class Lecture {
  constructor(object) {
    //object...授業オブジェクト

    this.schedule = object.periods; //[水１、木４]とか

    this.scheduleEnglish = this.schedule.map((scheduleJp) => {
      const weekNameJp = scheduleJp.charAt(0);
      const time = scheduleJp.charAt(1);
      if (weekNameJp == '月') {
        return 'monday' + time;
      } else if (weekNameJp == '火') {
        return 'tuesday' + time;
      } else if (weekNameJp == '水') {
        return 'wednesday' + time;
      } else if (weekNameJp == '木') {
        return 'thursday' + time;
      } else if (weekNameJp == '金') {
        return 'friday' + time;
      }
    });
    //週間表のidを英語名にしているため、this.scheduleの英語名を作っておく。
    this.title = object.titleJp;
    this.code = object.code; //授業コード
    this.registorButton = document.getElementById(this.code.toString()); //授業登録ボタン
    this.data = object;
    this.data.scheduleEnglish = this.scheduleEnglish;
  }

  showDetail() {
    //その曜限の授業のシラバスを表示
  }

  closeDetail() {
    //とじる
  }

  registor() {
    //こっちかも？
    console.log('registoring...');

    //訂正しろ
    registoredLecturesList.push(this.data);

    console.log(registoredLecturesList);
    for (const lecture of registoredLecturesList) {
      const cell = document.getElementById(lecture.scheduleEnglish);
      if (cell === null) {
        console.log('registor failed');
      } else {
        if (cell.textContent.indexOf('検索') !== -1) {
          cell.textContent = lecture.titleJp;
          countCredits();
        } else {
          cell.textContent += `\n${lecture.titleJp}`;
          countCredits();
        }
      }
    }
  }
}

function formatJSON(data) {
  let html =
    '<tr><th>曜限</th><th>科目名</th><th>教員</th><th>場所</th><th>授業コード</th><th>登録ボタン</th></tr>';
  for (let lesson of data) {
    html +=
      '</td><td>' +
      lesson.periods +
      '</td><td>' +
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

  result.innerHTML = html;
}

fetch(url)
  .then((response) => response.json())
  .then((data) => {
    formatJSON(data);
  });

fetch(url)
  .then((response) => response.json())
  .then((data) => {
    for (const lesson of data) {
      const lecture = new Lecture(lesson);
      console.log(lecture);
      console.log(lecture.data);
      lecture.registorButton.onclick = () => {
        lecture.registor();
      };
      //lecture.registorButton.onclick = lecture.registorは、thisが正しく認識されない。
    }
  });

// const showButton = document.getElementById("show");
// showButton.onclick = () => {
//   for (let i = 1; i <= 6; i++) {
//     for (const week of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {

//     }}
// }

class Cell {
  constructor(week, time) {
    this.week = week; //曜日名英語小文字
    this.time = time; //時限名整数
    if (
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].indexOf(
        this.week
      ) !== -1
    ) {
      const weekNameJp = ['月', '火', '水', '木', '金'];
      this.weekJp =
        weekNameJp[
          ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].indexOf(
            this.week
          )
        ];
    }
    this.id = `${this.week}${this.time}`; //各td要素のid
    this.idJp = `${this.weekJp}${this.time}`; //月1,火2,とか
    this.element = document.getElementById(this.id);
    this.credit = 0; //単位数
    this.lectureName = ''; //講義名
    this.code = ''; //授業コード
    this.detail = '';
    this.clickable = true; //クリックして曜限検索可能か。ダメならFalse
    this.removeButton = document.createElement('button');
    this.removeButton.setAttribute('onclick', () => {});
  }

  //講義をカレンダーに書き込む
  registor() {
    this.lectureName = ''; //必修リストか、気になった授業から講義を取ってくる
    this.element.textContent = this.lectureName;
    this.clickable = false;
    registoredLecturesList.concat({});
  }

  showDeleteButton() {
    //授業消去ボタン

    this.element.appendChild(removeButton);
  }

  delete() {
    //（ひっしゅうで無ければ？）授業を取り消す
    //registoredLessonsListから削除
    this.element.textContent = '';
    this.clickable = true;
  }

  search() {
    if (this.clickable) {
      console.log('search working!');
      console.log(result);
      // fetch(url)
      //   .then((response) => response.json())
      //   .then((data) =>
      // formatJSON(
      //   data.filter(
      //     //曜限被ってる授業だけ残す
      //     (element) => {
      //       console.log(element);
      //       for (const koma of element.periods) {
      //         if (koma === this.idJp) {
      //           return true;
      //         }
      //       }
      //       return false;
      //     }
      //   )
      // )
      // );
    }
    //../index.htmlに戻したい。
  }
}

class Hisshu extends Lecture {}

for (let i = 1; i <= 6; i++) {
  for (const week of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
    const cell = new Cell(week, i);
    console.log(cell);
    if (cell.element !== null) {
      if (cell.clickable) {
        cell.element.onclick = () => {
          cell.search();
        };
 
      }
    }
  }
}

console.log(document.getElementById('table').innerHTML);