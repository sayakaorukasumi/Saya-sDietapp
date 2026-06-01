// 運動リスト。met = 運動強度（消費カロリー計算に使用）
// kcalPerRep = 回数単位の時の1回あたりカロリー（回単位で使う種目用）
// desc = 種目選択時に表示する説明（null なら非表示）
const EXERCISE_OPTIONS = [
  { name: "やさしめ筋トレ",    defaultUnit: "min", met: 3.0, kcalPerRep: 0.3,  desc: null },
  { name: "中くらい筋トレ",    defaultUnit: "min", met: 5.0, kcalPerRep: 0.5,  desc: null },
  { name: "やさしめストレッチ", defaultUnit: "min", met: 2.3, kcalPerRep: 0.2,  desc: null },
  { name: "中くらいストレッチ", defaultUnit: "min", met: 3.0, kcalPerRep: 0.3,  desc: null },
  { name: "プランク",          defaultUnit: "min", met: 3.5, kcalPerRep: null, desc: "肘またはつま先で体を支えてキープ・体幹を鯍える" },
  { name: "ワイドスクワット",  defaultUnit: "rep", met: 5.0, kcalPerRep: 0.4,  desc: "足を肩幅より広めに開いてしゃがむ・内ももとお尻に効く" },
  { name: "ヒップリスト",      defaultUnit: "rep", met: 3.5, kcalPerRep: 0.25, desc: "仰向けで膝を立ててお尻を持ち上げる・お尻と裏ももに効く" },
  { name: "クランチ",          defaultUnit: "rep", met: 3.8, kcalPerRep: 0.3,  desc: "仰向けで膝を立てて上体を少し起こす・お腹の前側を鯍える" },
  { name: "ロシアンツイスト",  defaultUnit: "rep", met: 3.8, kcalPerRep: 0.3,  desc: "座って上体を左右にひねる・わき腹・腹斌筋に効く" },
  { name: "トゥータップ",      defaultUnit: "rep", met: 3.5, kcalPerRep: 0.2,  desc: "仰向けで足を上げてつま先を交互に下ろす・下腹部に効く" },
  { name: "カーフレイズ",      defaultUnit: "rep", met: 3.0, kcalPerRep: 0.15, desc: "つま先立ちを繰り返す・ふくらはぎを鯍える" },
  { name: "バックアームリフト", defaultUnit: "rep", met: 3.0, kcalPerRep: 0.2,  desc: "うつぶせで腕を後ろに持ち上げる・背中・肩周りに効く" },
  { name: "有酸素ダンス",      defaultUnit: "min", met: 6.0, kcalPerRep: null, desc: null },
  { name: "ウォーキング",      defaultUnit: "min", met: 3.5, kcalPerRep: null, desc: null },
  { name: "軽めのランニング",  defaultUnit: "min", met: 6.0, kcalPerRep: null, desc: null },
  { name: "その他",            defaultUnit: "min", met: 3.0, kcalPerRep: 0.3,  desc: null },
];
