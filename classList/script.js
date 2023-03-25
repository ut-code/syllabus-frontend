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

    //同じ授業が登録されていないなら、登録リストに授業を入れる関数
function append(array,lectureObject) {
  let n = 0;
    for (const lecture of array) {
      if (lecture === lectureObject) {
        n++;
      }
    }
    if (n === 0) {
      array.push(lectureObject);
    }
}

function translateWeekNameIntoEnglish(weekNameJp) {
  if (weekNameJp == '月') {
    return 'monday';
  } else if (weekNameJp == '火') {
    return 'tuesday';
  } else if (weekNameJp == '水') {
    return 'wednesday';
  } else if (weekNameJp == '木') {
    return 'thursday';
  } else if (weekNameJp == '金') {
    return 'friday';
  }
}

function findLectureByCode(code) {
  const codeNumber = Number(code);
  const lecture = array.filter((l) => l.code === codeNumber)
  return lecture[0];
}

class Lecture {
  constructor(object) {
    //object...授業オブジェクト

    this.schedule = object.periods; //[水１、木４]とか

    this.scheduleEnglish = this.schedule.map((scheduleJp) => {
      const weekNameJp = scheduleJp.charAt(0);
      const time = scheduleJp.charAt(1);
      // if (weekNameJp == '月') {
      //   return 'monday' + time;
      // } else if (weekNameJp == '火') {
      //   return 'tuesday' + time;
      // } else if (weekNameJp == '水') {
      //   return 'wednesday' + time;
      // } else if (weekNameJp == '木') {
      //   return 'thursday' + time;
      // } else if (weekNameJp == '金') {
      //   return 'friday' + time;
      // }
      return translateWeekNameIntoEnglish(weekNameJp) + time;
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

    //同じ授業が登録されていないなら、登録リストに授業を入れる
    append(registoredLecturesList, this.data);

    console.log("今登録されている授業は");
    console.log(registoredLecturesList);

    //カレンダーに授業を書き込む
    //あとで
    for (const lecture of registoredLecturesList) {
      for (const yougen of lecture.scheduleEnglish /*それぞれの曜限で*/) {
      const cell = new Cell(yougen.slice(0, -1), yougen.at(-1));
      console.log(cell);
      cell.writeInCalender();
      countCredits();
      }}
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


async function getData(){
  const response = await fetch(url);
  const data = await response.json();
  console.log(data);
}

getData();

// async function getData(){
//   const response = await fetch(url);
//   return await response.json();
// }
// const data = getData();
// console.log(data);

// fetch(url)
//   .then((response) => response.json())
//   .then((data) => {
//     formatJSON(data);
//   });

// fetch(url)
//   .then((response) => response.json())
//   .then((data) => {
//     for (const lesson of data) {
//       const lecture = new Lecture(lesson);
//       console.log(lecture);
//       console.log(lecture.data);
//       lecture.registorButton.onclick = () => {
//         lecture.registor();
//       };
//       //lecture.registorButton.onclick = lecture.registorは、thisが正しく認識されない。
//     }
//   });

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
    this.clickable = true; //クリックして曜限検索可能か。ダメならFalse
    this.removeButton = document.createElement('button');
    this.removeButton.setAttribute('onclick', () => {});
    this.classList = [];//その曜限に登録されている授業
  }

  //講義をカレンダーに書き込む
  writeInCalender() {
    this.element.textContent = `${this.idJp}検索`;//一旦リセット
    for (const lecture of registoredLecturesList.filter( (lec) => {if (lec.periods.indexOf(this.idJp) !== -1) {return true;} else {return false;}} )){
      
      if (this.element.textContent.indexOf('検索') !== -1 /*まだその曜限に授業が入ってない*/) {
        this.element.textContent = lecture.titleJp;
       
      } else {this.element.textContent += "\n" +  lecture.titleJp;}
    }
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

// for (let i = 1; i <= 6; i++) {
//   for (const week of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
//     const cell = new Cell(week, i);
//     console.log(cell);
//     if (cell.element !== null) {
//       if (cell.clickable) {
//         cell.element.onclick = () => {
//           cell.search();
//         };
 
//       }
//     }
//   }
// }

console.log(document.getElementById('table').innerHTML);

//必修自動入力書きかけ
const hisshuCodeItiran = []
const showButton = document.getElementById("show");
//formのvalueを受け取る
showButton.onclick = (valueKarui, valueClassNumber) => {
  const classId = valueKarui + "_" + valueClassNumber;
  for (const code of hisshuCodeItiran.classId) {
    const jugyouobject = findLectureByCode(code);
    append(registoredLecturesList, jugyouobject);
    const lecture = new Lecture(jugyouobject)
    lecture.registor();
  }
}
//問題・・・どうやってコードから授業見つけんねん。授業とってきた方が楽なんですが...