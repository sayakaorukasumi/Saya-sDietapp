// よく食べる食事リスト。kcal は目安値。
// 食べ物の名前を入力すると候補が出て、kcal が自動入力される。
const FOOD_DATABASE = [
  // 主食
  { name: "ご飯（普通盛り）",             kcal: 270, protein: 4.1, fat: 0.5, carbs: 60.0, fiber: 0.5 },
  { name: "ご飯（小盛り）",               kcal: 180, protein: 2.7, fat: 0.3, carbs: 40.0, fiber: 0.3 },
  { name: "ご飯（大盛り）",               kcal: 360, protein: 5.5, fat: 0.7, carbs: 80.0, fiber: 0.7 },
  { name: "お弁当",                       kcal: 350, protein: 15.0, fat: 16.0, carbs: 54.0, fiber: 2.0 },
  { name: "エビマヨおにぎり（セブン）",   kcal: 214, protein: 6.0, fat: 8.0, carbs: 29.0, fiber: 0.5 },
  { name: "コロッケ（セブン・1個）",      kcal: 155, protein: 2.8, fat: 9.5, carbs: 15.0, fiber: 1.0 },
  { name: "揚げ鸟（セブン・1個）",        kcal: 240, protein: 16.0, fat: 15.0, carbs: 8.0, fiber: 0.5 },
  { name: "ラーメン",                     kcal: 500, protein: 18.0, fat: 18.0, carbs: 60.0, fiber: 2.0 },
  { name: "チャーハン",                   kcal: 600, protein: 14.0, fat: 20.0, carbs: 80.0, fiber: 1.0 },
  // タンパク質・おかず
  { name: "ゆでたまご",                   kcal: 80,  protein: 6.2, fat: 5.2, carbs: 0.3, fiber: 0.0 },
  { name: "卵焼き",                       kcal: 120, protein: 8.0, fat: 8.0, carbs: 3.0, fiber: 0.0 },
  { name: "豆腐（半丁）",                 kcal: 70,  protein: 4.9, fat: 3.0, carbs: 1.7, fiber: 0.5 },
  { name: "唐揚げ（2〜3個）",             kcal: 250, protein: 17.0, fat: 15.0, carbs: 10.0, fiber: 0.3 },
  { name: "納豆（1パック）",              kcal: 100, protein: 8.3, fat: 5.0, carbs: 5.4, fiber: 3.0 },
  // 手作りおかず
  { name: "白菜と豚肉煮たやつ",           kcal: 250, protein: 15.0, fat: 12.0, carbs: 14.0, fiber: 2.0 },
  { name: "豚肉で人参と山芋巻いたやつ",   kcal: 200, protein: 13.0, fat: 10.0, carbs: 14.0, fiber: 1.5 },
  { name: "ちくわできゅうり巻いたやつ（3個）", kcal: 90, protein: 6.5, fat: 1.0, carbs: 12.0, fiber: 0.5 },
  // 汁物
  { name: "味噌汁",                       kcal: 40,  protein: 2.0, fat: 1.0, carbs: 5.0, fiber: 1.0 },
  // 果物・デザート
  { name: "りんご（半個）",               kcal: 65,  protein: 0.2, fat: 0.1, carbs: 17.0, fiber: 1.5 },
  { name: "みかん（1個）",                kcal: 45,  protein: 0.7, fat: 0.1, carbs: 11.0, fiber: 1.0 },
  { name: "ビヒダスのナタデココヨーグルト", kcal: 100, protein: 3.8, fat: 2.8, carbs: 15.0, fiber: 0.5 },
  { name: "アイスクリーム",               kcal: 200, protein: 3.0, fat: 10.0, carbs: 25.0, fiber: 0.0 },
  // 外食
  { name: "牛丼（家で）",                 kcal: 450, protein: 20.0, fat: 14.0, carbs: 56.0, fiber: 1.0 },
  { name: "カレーライス（家で）",          kcal: 600, protein: 15.0, fat: 14.0, carbs: 90.0, fiber: 3.0 },
  { name: "オムライス",                   kcal: 500, protein: 16.0, fat: 18.0, carbs: 54.0, fiber: 1.0 },
  { name: "カルボナーラパスタ",           kcal: 650, protein: 20.0, fat: 28.0, carbs: 68.0, fiber: 2.0 },
  { name: "うまかっちゃん高菜ラーメン",   kcal: 430, protein: 10.0, fat: 16.0, carbs: 57.0, fiber: 2.0 },
  // マクドナルド
  { name: "マックフライポテトL",           kcal: 454, protein: 5.0, fat: 22.0, carbs: 58.0, fiber: 4.0 },
  { name: "チキンマックナゲット5ピース",  kcal: 270, protein: 13.0, fat: 16.0, carbs: 16.0, fiber: 0.5 },
  { name: "チーズバーガー",               kcal: 310, protein: 14.0, fat: 13.0, carbs: 35.0, fiber: 1.0 },
  { name: "ファンタグレープM",            kcal: 170, protein: 0.0, fat: 0.0, carbs: 44.0, fiber: 0.0 },
  // 間食
  { name: "ポテトチップス（小袋）",        kcal: 130, protein: 1.0, fat: 8.0, carbs: 14.0, fiber: 0.5 },
  { name: "おせんべい（2枚）",            kcal: 80,  protein: 2.0, fat: 1.0, carbs: 17.0, fiber: 0.2 },
  { name: "クッキー（2枚）",              kcal: 100, protein: 1.5, fat: 5.0, carbs: 13.0, fiber: 0.3 },
  { name: "プロテインバー",               kcal: 200, protein: 20.0, fat: 7.0, carbs: 18.0, fiber: 2.0 },
  { name: "プロテイン（1杯）",            kcal: 120, protein: 24.0, fat: 1.0, carbs: 5.0, fiber: 0.0 },
  { name: "しゃりもにグミ（3粒）",        kcal: 15,  protein: 0.0, fat: 0.0, carbs: 4.0, fiber: 0.0 },
  { name: "柿ピー（少し）",               kcal: 50,  protein: 1.5, fat: 2.0, carbs: 7.0, fiber: 0.5 },
  { name: "大豆の入り焼き（少し）",        kcal: 40,  protein: 3.0, fat: 2.0, carbs: 3.0, fiber: 1.0 },
  { name: "飴（4粒）",                    kcal: 60,  protein: 0.0, fat: 0.0, carbs: 15.0, fiber: 0.0 },
  { name: "チョコ（4粒）",                kcal: 110, protein: 1.5, fat: 7.0, carbs: 11.5, fiber: 0.5 },
  { name: "堅焼きポテト（少し）",          kcal: 60,  protein: 1.0, fat: 3.0, carbs: 8.0, fiber: 0.5 },
  { name: "かりんとう（少し）",            kcal: 50,  protein: 0.8, fat: 1.5, carbs: 9.0, fiber: 0.3 },
  { name: "ムーンライト（1つ）",           kcal: 35,  protein: 0.5, fat: 1.5, carbs: 5.0, fiber: 0.1 },
];
