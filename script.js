const statistics = {
  "code": "50001",
  "type": "総合科目",
  "category": "Ｆ（数理・情報）",
  "ccCode": "CAS-GC1F41L1",
  "titleJp": "アルゴリズム入門",
  "titleEn": "Introduction to Algorithms",
  "lecturerJp": "山口　文彦",
  "lecturerEn": "YAMAGUCHI Fumihiko",
  "semester": "A1A2",
  "period": "月曜1限",
  "detail": "コンピュータやインターネットに代表される情報処理・情報通信技術は、現代社会の基盤となっています。このような技術の基盤となっているのが「アルゴリズム」と呼ばれる概念です。アルゴリズムは、観測データからの気象予測や、文章からの執筆年代予測など、あらゆる分野での問題解決の基礎となるものです。\n\n本科目の目的は、アルゴリズムの基本概念や、アルゴリズムを作るための考え方を、Python言語によるプログラミングをを通して習得することです。\n",
  "credits": "2",
  "academicYear": "Other",
  "otherFaculties": "不可 NO",
  "classroom": "情報教育棟 E21教室",
  "language": "日本語        Japanese",
  "schedule": "主に大規模データ処理・シミュレーションを題材とし、プログラミングを通し\nて問題解決・アルゴリズムの基礎を学びます。なお、プログラミングの学習は\n必要最小限にとどめます。\n\n扱う話題としては以下のものが挙げられます。\n\n- 数の計算と変数・関数\n- 成績の集計\n- ライフゲーム\n- 放物運動のシミュレーション\n- p値の計算\n- データの検索\n- 多次元データからの情報抽出",
  "methods": "講義と演習を行います。",
  "evaluation": "試験および演習課題の成績によって評価します。\n試験は基本的な事項の確認を中心とした問題になります。出題範囲などにつ\nいては授業中に知らせます。",
  "notes": "1年理科生はクラス指定、2年理科生・及び文科生はクラス指定なし。文科生向けの講義も別途開講。"
}

const table = document.getElementById("table");
const itigyoume = table.insertRow();
const itiretume = itigyoume.insertCell();
text = document.createTextNode(`${statistics.type + statistics.category}`);
itiretume.appendChild(text);
