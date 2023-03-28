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
    if (this.registorButton.innerText === "登録") {
    this.registorButton.onclick = () => {
      append(registoredLecturesList, this.data);
      this.registor();
    }
    
  } else if (this.registorButton.innerText === "削除") {
    this.registorButton.onclick = () => {
      this.delete();
    }
  }
    this.data = object;
    this.data.scheduleEnglish = this.scheduleEnglish;
  }

  delete() {
    registoredLecturesList = registoredLecturesList.filter((l) => (l.code) !== this.code );
    this.registor();
    this.registorButton.style = "color:green;"
    this.registorButton.textContent = "登録"
    this.registorButton.onclick = () => {
      append(registoredLecturesList, this.data);
      this.registor()
    };
  }

  showDetail() {
    //その曜限の授業のシラバスを表示
  }

  closeDetail() {
    //とじる
  }

  registor() {
    //こっちかも
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
    this.registorButton.style = "color:red;"
    this.registorButton.textContent = "削除"
    this.registorButton.onclick = () => {this.delete()};
  }
}

function formatJSON(data) {
  let html =
    '<tr><th>曜限</th><th>科目名</th><th>教員</th><th>場所</th><th>授業コード</th><th>登録ボタン</th></tr>';
  for (const lesson of data) {
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

  result.innerHTML = html;
  for (const lesson of data) {
    new Lecture(lesson);//ついでにクラス作っちゃえ
  }
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
  if (forThisClass === undefined/*クラスが存在しない*/) {
    const min = 1;
    var max = 2;
    const randomNumber = Math.floor(Math.random() * (max + 1 - min)) + min;
    const response = await fetch("./classList/error" + randomNumber + ".txt");
    const askiiArt = await response.text();
    const div = document.getElementById("askiiArt");
    div.innerHTML = askiiArt;
    div.innerHTML += ["あんた、バカじゃないの？","<div>虚偽の情報を伝えることは、情報統合思念体としても、私個人としても望まれることではない。</div><div>---sleeping forever---</div>"][randomNumber - 1];
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
  }

  //講義をカレンダーに書き込む
  writeInCalender() {
    this.element.innerHTML = `${this.idJp}検索`;//一旦リセット
    for (const lecture of registoredLecturesList.filter( (lec) => {if (lec.periods.indexOf(this.idJp) !== -1) {return true;} else {return false;}}/*曜限が同じ授業だけ*/ )){
      
      if (this.element.innerHTML.indexOf('検索') !== -1 /*まだその曜限に授業が入ってない*/) {
        this.element.innerHTML = lecture.titleJp;
       
      } else {this.element.innerHTML += "<br>" +  lecture.titleJp;}
    }
    if (this.element.innerHTML.indexOf('検索') !== -1) {
      this.element.setAttribute("class", "empty");
    } else {
      this.element.setAttribute("class", "registored");
    }
  }

  async search() {
    const response = await fetch(url);
    const lecturedata = await response.json();
      
    //対象曜限の行にvisibleクラス、その他の行にinvisibleクラスを付与する
    //まずリセット
    //innerHTMLをいじって死にました。ぴえん。
  
    //登録ボタンを復活させるため、再びクラス生成
    for (const lecture of lecturedata) {
      const tr = document.getElementById("tr" + lecture.code);
      tr.removeAttribute("class");
      if (document.getElementById("yougen" + lecture.code).innerText.indexOf(this.idJp) >= 0/*検索したい曜限が入ってたら*/) {
        tr.setAttribute("class", "visible");
      } else {
        tr.setAttribute("class", "invisible");
      }
    }
    document.getElementById("when").textContent = `${this.idJp}の授業を検索中`
    
  }
}

//曜限検索を発動
for (let i = 1; i <= 6; i++) {
  for (const week of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
    const cell = new Cell(week, i);
    if (cell.element !== null) {
        cell.element.onclick = () => {
          console.log('search working!');
          cell.search();
      };       
    }
  }
}


const showButton = document.getElementById("show");
//formのvalueを受け取る
showButton.onclick = () => {
  const valueKarui = document.getElementById("selectKarui").value;
  const valueClassNumber = document.getElementById("classNumber").value;
  const classId = valueKarui + "_" + valueClassNumber;
  console.log(classId);
  registorHisshu(classId);
}
