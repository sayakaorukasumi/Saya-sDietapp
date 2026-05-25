// 運動リスト。met = 運動強度（消費カロリー計算に使用）
// kcalPerRep = 回数単位の時の1回あたりカロリー（回単位で使う種目用）
const EXERCISE_OPTIONS = [
  { name: "やさしめ筋トレ",    defaultUnit: "min", met: 3.0, kcalPerRep: 0.3 },
  { name: "中くらい筋トレ",    defaultUnit: "min", met: 5.0, kcalPerRep: 0.5 },
  { name: "やさしめストレッチ", defaultUnit: "min", met: 2.3, kcalPerRep: 0.2 },
  { name: "中くらいストレッチ", defaultUnit: "min", met: 3.0, kcalPerRep: 0.3 },
  { name: "プランク",          defaultUnit: "min", met: 3.5, kcalPerRep: null },
  { name: "ワイドスクワット",  defaultUnit: "rep", met: 5.0, kcalPerRep: 0.4  },
  { name: "ヒップリスト",      defaultUnit: "rep", met: 3.5, kcalPerRep: 0.25 },
  { name: "有酸素ダンス",      defaultUnit: "min", met: 6.0, kcalPerRep: null },
  { name: "ウォーキング",      defaultUnit: "min", met: 3.5, kcalPerRep: null },
  { name: "軽めのランニング",  defaultUnit: "min", met: 6.0, kcalPerRep: null },
  { name: "その他",            defaultUnit: "min", met: 3.0, kcalPerRep: 0.3 },
];
