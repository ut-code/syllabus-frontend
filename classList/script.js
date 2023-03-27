const url = './classList/data-beautified2023.json';
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

    console.log("今登録されている授業は");
    console.log(registoredLecturesList);

    //カレンダーに授業を書き込む 
      for (const yougen of this.scheduleEnglish /*それぞれの曜限で*/) {
      const cell = new Cell(yougen.slice(0, -1), yougen.at(-1));
      console.log(cell);
      cell.writeInCalender();
      
      }
      countCredits();
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


// async function getData(url){
//   const response = await fetch(url);
//   const data = await response.json();
// }
async function registorHisshu(classId){
  const urlForRequiredLectureCode = "./classList/requiredLecture2023.json";
  const response = await fetch(urlForRequiredLectureCode);
  const data = await response.json();
  const keyAndValue = Object.entries(data);//["s1_32", ["授業コード","授業コード",...]]みたいな配列
  const forThisClass = keyAndValue.filter((keyAndValue) => (keyAndValue[0]) === classId)[0]//自分のクラスを取ってくる
  if (forThisClass === undefined) {
    const response = await fetch("./classList/error2.txt");
    const askiiArt = await response.text();
    document.write(askiiArt);
    //document.write("少し、頭冷やそうか。")
    //document.write("おイタしちゃだめにょろよ。")
  }
  else {

  const lectureCodes = await forThisClass[1];

  const response = await fetch(url);
  const lecturedata = await response.json();
  // for (const code of lectureCodes) {
  //   // findLectureByCode(code);
  //   const lecture = lecturedata.filter((l) => l.code === code)[0]
  //   if (lecture !== undefined/* 授業が見つかったら*/) {
  //   append(registoredLecturesList,lecture);
  //   }
  // }
  for (const lecture of lecturedata) {
    // findLectureByCode(code);
    if ( lectureCodes.indexOf(lecture.code) >= 0 /* 授業が見つかったら*/) {
      append(registoredLecturesList,lecture);
    }
  }
  for (const lecture of registoredLecturesList) {
    const lectureObject = new Lecture(lecture);
    console.log(lectureObject)
    lectureObject.registor();
  }
}
}

// getData(url);

// async function getData(){
//   const response = await fetch(url);
//   return await response.json();
// }
// const data = getData();
// console.log(data);これらはPromiseオブジェクトを返してしまう。

fetch(url)
  .then((response) => response.json())
  .then((data) => {
    formatJSON(data);
  });

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
    for (const lecture of registoredLecturesList.filter( (lec) => {if (lec.periods.indexOf(this.idJp) !== -1) {return true;} else {return false;}}/*曜限が同じ授業だけ*/ )){
      
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

//必修自動入力書きかけ
const hisshuCodeItiran = []
const showButton = document.getElementById("show");
//formのvalueを受け取る
showButton.onclick = () => {
  const valueKarui = document.getElementById("selectKarui").value;
  const valueClassNumber = document.getElementById("classNumber").value;
  const classId = valueKarui + "_" + valueClassNumber;
  console.log(classId);
  // for (const code of hisshuCodeItiran.classId) {
  //   const jugyouobject = findLectureByCode(code);
  //   append(registoredLecturesList, jugyouobject);
  //   const lecture = new Lecture(jugyouobject)
  //   lecture.registor();
  // }
  registorHisshu(classId);
}
