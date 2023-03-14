const url = "data-beautified.json"
let result;

function formatJSON(data) {
  let html = "<tr><th>系列</th><th>曜限</th><th>科目名</th><th>教員</th><th>場所</th><th>授業コード</th></tr>";
  for (let lesson of data) {
    html += "<tr><td>" + lesson.type + 
    lesson.category + "</td><td>"
    + lesson.periods + "</td><td>"
    + lesson.titleJp + "</td><td>"
    + lesson.lecturerJp + "</td><td>"
    + lesson.classroom + "</td><td>"
    + lesson.code + "</td></tr>"
  }
  result.innerHTML = html;
}

window.addEventListener("load", () => {
  result = document.getElementById("table");
  fetch(url).then(response => response.json()).then(data => formatJSON(data));
}) 
