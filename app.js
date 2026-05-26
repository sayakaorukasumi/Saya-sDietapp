const STORAGE_KEY = "saya-diet-records";
const PROFILE_KEY = "saya-diet-profile";

// iOSのフォーカス時自動ズームをJSで防止
(function() {
  const viewport = document.querySelector('meta[name=viewport]');
  if (!viewport) return;
  document.addEventListener('focusin', () => {
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0';
  });
  document.addEventListener('focusout', () => {
    viewport.content = 'width=device-width, initial-scale=1.0';
  });
})();

// ---------- ストレージ ----------
function loadRecords() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}
function saveRecords(r) { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }

function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
  catch { return {}; }
}
function saveProfile(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

// ---------- 日付ユーティリティ ----------
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDateJa(s) {
  const [y,m,d] = s.split("-");
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

// ---------- 運動データの後方互換 ----------
function normalizeExercise(ex) {
  if (ex.value != null) return ex;
  return { name: ex.name, value: ex.minutes, unit: "min", kcal: ex.kcal ?? null };
}

// ---------- カロリー計算 ----------
function getCurrentWeight() {
  const v = parseFloat(document.getElementById("weight-input").value);
  if (!isNaN(v) && v > 0) return v;
  const entries = Object.entries(loadRecords())
    .filter(([,r]) => r.weight != null)
    .sort((a,b) => b[0].localeCompare(a[0]));
  return entries.length ? entries[0][1].weight : null;
}

function calcKcal(ex, weight) {
  if (!weight) return null;
  const def = EXERCISE_OPTIONS.find(e => e.name === ex.name);
  if (!def) return null;
  const unit = ex.unit || "min";
  if (unit === "rep") {
    return def.kcalPerRep != null ? Math.round(def.kcalPerRep * ex.value) : null;
  }
  return def.met ? Math.round(def.met * weight * (ex.value / 60)) : null;
}

function getKcalTarget() {
  const p = loadProfile();
  if (p.kcalTarget && p.kcalTarget > 0) return p.kcalTarget;
  const weight = getCurrentWeight() || 60;
  const height = p.height || 168;
  const bmr = 10 * weight + 6.25 * height - 5 * 30 - 161;
  return Math.round(bmr * 1.375 - 350);
}

// ---------- 状態 ----------
let pendingExercises = [];
let pendingMeals = [];
let currentUnit = "min";

// ---------- 初期化 ----------
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initExerciseSelect();
  initUnitToggle();
  initFoodDatalist();
  initDateInput();
  loadDateData(todayStr());
  bindEvents();
  loadProfileForm();
  renderStatsTab();
});

// ---------- タブ ----------
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "stats") renderStatsTab();
      if (btn.dataset.tab === "profile") renderProfileSummary();
    });
  });
}

// ---------- 単位トグル ----------
function initUnitToggle() {
  document.getElementById("unit-toggle").addEventListener("click", () => {
    currentUnit = currentUnit === "min" ? "rep" : "min";
    updateUnitUI();
  });
}
function updateUnitUI() {
  const btn = document.getElementById("unit-toggle");
  const inp = document.getElementById("exercise-value");
  if (currentUnit === "min") {
    btn.textContent = "分"; btn.classList.remove("rep");
    inp.placeholder = "分";
  } else {
    btn.textContent = "回"; btn.classList.add("rep");
    inp.placeholder = "回";
  }
}

// ---------- 運動プルダウン ----------
function initExerciseSelect() {
  const sel = document.getElementById("exercise-select");
  sel.innerHTML = EXERCISE_OPTIONS.map(e =>
    `<option value="${e.name}">${e.name}</option>`).join("");
  sel.addEventListener("change", () => {
    const def = EXERCISE_OPTIONS.find(e => e.name === sel.value);
    if (def) { currentUnit = def.defaultUnit; updateUnitUI(); }
  });
}

// ---------- 食事データリスト ----------
function initFoodDatalist() {
  const dl = document.getElementById("food-datalist");
  dl.innerHTML = FOOD_DATABASE.map(f => `<option value="${f.name}">`).join("");

  document.getElementById("food-name-input").addEventListener("input", e => {
    const val = e.target.value;
    const match = FOOD_DATABASE.find(f => f.name === val);
    const customRow = document.getElementById("custom-nutrition-row");
    if (match) {
      document.getElementById("food-kcal-input").value = match.kcal;
      customRow.hidden = true;
    } else {
      customRow.hidden = !val.trim();
    }
  });
}

function initDateInput() {
  document.getElementById("date-input").value = todayStr();
}

// ---------- イベントバインド ----------
function bindEvents() {
  document.getElementById("date-input").addEventListener("change", e => loadDateData(e.target.value));

  document.getElementById("add-exercise").addEventListener("click", () => {
    const name = document.getElementById("exercise-select").value;
    const value = parseInt(document.getElementById("exercise-value").value);
    if (!name || !value || value <= 0) { alert("種目と数値を入れてね"); return; }
    const kcal = calcKcal({ name, value, unit: currentUnit }, getCurrentWeight());
    pendingExercises.push({ name, value, unit: currentUnit, kcal });
    document.getElementById("exercise-value").value = "";
    renderExerciseList();
  });

  document.getElementById("add-food-btn").addEventListener("click", addFood);

  document.getElementById("save-weight-btn").addEventListener("click", saveWeight);
  document.getElementById("save-exercise-btn").addEventListener("click", saveExercise);
  document.getElementById("save-food-btn").addEventListener("click", saveMeals);

  document.querySelectorAll(".range-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".range-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderChart(btn.dataset.range);
    });
  });

  document.getElementById("save-profile-btn").addEventListener("click", saveProfileForm);
  document.getElementById("auto-calc-kcal-btn").addEventListener("click", autoCalcKcalTarget);
  document.getElementById("export-btn").addEventListener("click", exportData);
  document.getElementById("import-btn").addEventListener("click", () =>
    document.getElementById("import-file").click());
  document.getElementById("import-file").addEventListener("change", importData);
}

// ---------- 日付データの読み込み ----------
function loadDateData(dateStr) {
  const r = loadRecords()[dateStr];
  document.getElementById("weight-input").value = r?.weight ?? "";

  pendingExercises = r?.exercises ? r.exercises.map(normalizeExercise) : [];
  pendingMeals = r?.meals ? [...r.meals] : [];

  renderExerciseList();
  renderFoodList();
  updateCalorieBar();
  hideAllInlineComments();
}

function hideAllInlineComments() {
  ["weight", "exercise", "food"].forEach(zone => {
    document.getElementById(`partner-comment-${zone}`).hidden = true;
  });
}

// ---------- 運動リスト描画 ----------
function renderExerciseList() {
  const weight = getCurrentWeight();
  const ul = document.getElementById("exercise-list");
  ul.innerHTML = pendingExercises.map((e, i) => {
    const unitLabel = e.unit === "rep" ? "回" : "分";
    const kcal = e.kcal ?? calcKcal(e, weight);
    const kcalHtml = kcal != null ? `<span class="kcal-badge">約${kcal}kcal</span>` : "";
    return `<li>
      <span>${e.name} ${e.value}${unitLabel} ${kcalHtml}</span>
      <button class="remove" data-i="${i}" aria-label="削除">×</button>
    </li>`;
  }).join("");
  ul.querySelectorAll(".remove").forEach(b => {
    b.addEventListener("click", () => {
      pendingExercises.splice(parseInt(b.dataset.i), 1);
      renderExerciseList();
    });
  });
}

// ---------- 食事リスト ----------
function addFood() {
  const timing = document.getElementById("meal-timing").value;
  const name = document.getElementById("food-name-input").value.trim();
  const kcal = parseInt(document.getElementById("food-kcal-input").value);
  if (!name) { alert("食べたものを入力してね"); return; }
  if (!kcal || kcal <= 0) { alert("カロリーを入力してね"); return; }
  const dbMatch = FOOD_DATABASE.find(f => f.name === name);
  const customRow = document.getElementById("custom-nutrition-row");
  const readCustom = (id) => { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; };
  pendingMeals.push({
    timing, name, kcal,
    protein: dbMatch?.protein ?? (customRow.hidden ? null : readCustom("custom-protein")),
    fat:     dbMatch?.fat     ?? (customRow.hidden ? null : readCustom("custom-fat")),
    carbs:   dbMatch?.carbs   ?? (customRow.hidden ? null : readCustom("custom-carbs")),
    fiber:   dbMatch?.fiber   ?? (customRow.hidden ? null : readCustom("custom-fiber")),
  });
  document.getElementById("food-name-input").value = "";
  document.getElementById("food-kcal-input").value = "";
  ["custom-protein","custom-fat","custom-carbs","custom-fiber"].forEach(id => {
    document.getElementById(id).value = "";
  });
  customRow.hidden = true;
  renderFoodList();
  updateCalorieBar();
}

function renderFoodList() {
  const ul = document.getElementById("food-list");
  ul.innerHTML = pendingMeals.map((m, i) => {
    const src = (m.protein != null) ? m : (FOOD_DATABASE.find(d => d.name === m.name) || {});
    const nuts = [];
    if (src.protein != null) nuts.push(`<span class="nut-tag nut-p">P ${src.protein}g</span>`);
    if (src.fat     != null) nuts.push(`<span class="nut-tag nut-f">脂 ${src.fat}g</span>`);
    if (src.carbs   != null) nuts.push(`<span class="nut-tag nut-c">炭 ${src.carbs}g</span>`);
    if (src.fiber   != null) nuts.push(`<span class="nut-tag nut-fib">繊 ${src.fiber}g</span>`);
    const nutRow = nuts.length ? `<div class="food-nut-row">${nuts.join("")}</div>` : "";
    return `<li class="food-item">
      <div class="food-item-main">
        <span><span class="timing-badge">${m.timing}</span> ${m.name} <span class="kcal-badge">${m.kcal}kcal</span></span>
        <button class="remove" data-i="${i}" aria-label="削除">×</button>
      </div>
      ${nutRow}
    </li>`;
  }).join("");
  ul.querySelectorAll(".remove").forEach(b => {
    b.addEventListener("click", () => {
      pendingMeals.splice(parseInt(b.dataset.i), 1);
      renderFoodList();
      updateCalorieBar();
    });
  });
}

function updateCalorieBar() {
  const total = pendingMeals.reduce((s, m) => s + m.kcal, 0);
  const target = getKcalTarget();
  document.getElementById("today-intake-kcal").textContent = total;
  document.getElementById("target-kcal-label").textContent = target;
  const pct = Math.min((total / target) * 100, 100);
  const fill = document.getElementById("calorie-fill");
  fill.style.width = pct + "%";
  fill.classList.remove("near", "over");
  if (total > target) fill.classList.add("over");
  else if (pct >= 80) fill.classList.add("near");
}

// ---------- 保存（体重） ----------
function saveWeight() {
  const dateStr = document.getElementById("date-input").value;
  const weight = parseFloat(document.getElementById("weight-input").value);
  if (!dateStr) { alert("日付を入れてね"); return; }
  if (isNaN(weight) || weight <= 0) { alert("体重を入力してね"); return; }

  const records = loadRecords();
  const isFirstEver = Object.keys(records).length === 0;
  if (!records[dateStr]) records[dateStr] = {};
  records[dateStr].weight = weight;
  saveRecords(records);

  const diff = getWeightDiff(records, dateStr, weight);
  let category;
  if (isFirstEver) {
    category = "first_record";
  } else if (diff == null) {
    category = "default";
  } else if (diff <= -0.1) {
    category = "weight_decreased";
  } else if (diff >= 0.1) {
    category = "weight_increased";
  } else {
    category = "weight_same";
  }

  showInlineComment("weight", category, diff != null ? Math.abs(diff).toFixed(1) : null);
  renderStatsTab();
}

function getWeightDiff(records, dateStr, weight) {
  const prevEntries = Object.entries(records)
    .filter(([d, r]) => d < dateStr && r.weight != null)
    .sort((a, b) => b[0].localeCompare(a[0]));
  if (!prevEntries.length) return null;
  return weight - prevEntries[0][1].weight;
}

// ---------- 保存（運動） ----------
function saveExercise() {
  const dateStr = document.getElementById("date-input").value;
  if (!dateStr) { alert("日付を入れてね"); return; }
  if (pendingExercises.length === 0) { alert("運動を追加してね"); return; }

  const records = loadRecords();
  const isFirstEver = Object.keys(records).length === 0;
  if (!records[dateStr]) records[dateStr] = {};

  const weight = getCurrentWeight();
  records[dateStr].exercises = pendingExercises.map(e => ({
    ...e,
    kcal: e.kcal ?? calcKcal(e, weight),
  }));
  saveRecords(records);

  const streak = calcStreak(records, dateStr);
  const milestones = [3, 7, 14, 30, 60, 100, 200, 365];

  let category = isFirstEver ? "first_record" : "exercise_done";
  let n;
  if (!isFirstEver && milestones.includes(streak)) {
    category = "streak_milestone";
    n = streak;
  } else {
    const totalMin = pendingExercises.reduce((s, e) => s + (e.unit === "min" ? e.value : 0), 0);
    n = totalMin || pendingExercises.reduce((s, e) => s + e.value, 0);
  }

  showInlineComment("exercise", category, n);
  renderStatsTab();
}

// ---------- 保存（食事） ----------
function saveMeals() {
  const dateStr = document.getElementById("date-input").value;
  if (!dateStr) { alert("日付を入れてね"); return; }
  if (pendingMeals.length === 0) { alert("食事を追加してね"); return; }

  const records = loadRecords();
  if (!records[dateStr]) records[dateStr] = {};
  records[dateStr].meals = [...pendingMeals];
  saveRecords(records);

  const total = pendingMeals.reduce((s, m) => s + m.kcal, 0);
  const target = getKcalTarget();
  const category = total > target ? "food_over_calories" : "food_under_calories";
  showInlineComment("food", category, total);
  renderStatsTab();
}

// ---------- インラインコメント ----------
function pickLine(partner, category, n) {
  const lines = partner.lines[category] || partner.lines.default || [""];
  return lines[Math.floor(Math.random() * lines.length)].replace(/\{n\}/g, n ?? "");
}

function showInlineComment(zone, category, n) {
  const wrapper = document.getElementById(`partner-comment-${zone}`);
  const kEl = document.getElementById(`inline-kaoru-${zone}`);
  const cEl = document.getElementById(`inline-kasumi-${zone}`);

  kEl.textContent = pickLine(PARTNERS.kaoru, category, n);
  cEl.textContent = pickLine(PARTNERS.kasumi, category, n);

  wrapper.hidden = false;
  [kEl, cEl].forEach(el => {
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
  });
}

// ---------- 連続日数 ----------
function calcStreak(records, fromDateStr = todayStr()) {
  let streak = 0;
  const cursor = new Date(fromDateStr);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    const r = records[key];
    if (r?.exercises?.length > 0) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return streak;
}

function renderStreak() {
  const streak = calcStreak(loadRecords());
  document.getElementById("streak-number").textContent = streak;
  const sub = document.getElementById("streak-sub");
  if (streak === 0) sub.textContent = "今日運動して、新しい連続記録をスタート！";
  else if (streak < 7) sub.textContent = "いい調子！この調子で続けよう";
  else if (streak < 30) sub.textContent = "もう習慣になってきてる！";
  else sub.textContent = "すごい継続力…！本当にお疲れさま";
}

// ---------- 昨日との増減 ----------
function renderWeightDiff() {
  const records = loadRecords();
  const withWeight = Object.entries(records)
    .filter(([, r]) => r.weight != null)
    .sort((a, b) => b[0].localeCompare(a[0]));

  const el = document.getElementById("weight-diff-display");
  if (withWeight.length < 2) {
    el.innerHTML = '<p class="stat-empty">体重を2日分記録すると表示されます</p>';
    return;
  }

  const [latestDate, latestRec] = withWeight[0];
  const [prevDate, prevRec] = withWeight[1];
  const diff = latestRec.weight - prevRec.weight;
  const sign = diff > 0 ? "+" : "";
  const cls = diff < -0.05 ? "good" : diff > 0.05 ? "caution" : "";
  const label = diff < -0.05 ? "減った！" : diff > 0.05 ? "増えた" : "変わらず";

  el.innerHTML = `<div class="weight-diff-value ${cls}">
    ${sign}${diff.toFixed(1)}<span class="unit">kg</span>
    <span style="font-size:14px;font-weight:normal;margin-left:6px">${label}</span>
  </div>
  <p class="weight-diff-sub">${formatDateJa(prevDate)} → ${formatDateJa(latestDate)}</p>`;
}

// ---------- カロリー収支 ----------
function renderCalorieBalance() {
  const records = loadRecords();
  const dateStr = document.getElementById("date-input").value || todayStr();
  const r = records[dateStr] || {};

  const intake = r.meals ? r.meals.reduce((s, m) => s + m.kcal, 0) : 0;
  const burned = r.exercises
    ? r.exercises.reduce((s, e) => s + (normalizeExercise(e).kcal || 0), 0)
    : 0;
  const balance = intake - burned;

  document.getElementById("stat-intake").textContent = intake;
  document.getElementById("stat-burned").textContent = burned;

  const balEl = document.getElementById("stat-balance-el");
  const sign = balance > 0 ? "+" : "";
  balEl.textContent = `${sign}${balance} kcal`;
  balEl.className = balance > 500 ? "surplus" : balance < -200 ? "deficit" : "";
}

// ---------- 栄養バランス ----------
function renderNutritionBalance() {
  const records = loadRecords();
  const dateStr = document.getElementById("date-input").value || todayStr();
  const meals = records[dateStr]?.meals || [];
  const el = document.getElementById("nutrition-display");
  const adviceEl = document.getElementById("nutrition-partner-advice");

  if (!meals.length) {
    el.innerHTML = '<p class="stat-empty">食事を記録すると表示されます</p>';
    adviceEl.innerHTML = "";
    return;
  }

  let p = 0, f = 0, c = 0, fib = 0, hasData = false;
  meals.forEach(m => {
    const src = (m.protein != null) ? m : (FOOD_DATABASE.find(d => d.name === m.name) || {});
    if (src.protein != null) { p += src.protein; hasData = true; }
    if (src.fat != null) f += src.fat;
    if (src.carbs != null) c += src.carbs;
    if (src.fiber != null) fib += src.fiber;
  });

  if (!hasData) {
    el.innerHTML = '<p class="stat-empty">データベース内の食品を記録するとバランスが表示されます</p>';
    adviceEl.innerHTML = "";
    return;
  }

  const kcalTarget = getKcalTarget();
  const pTarget = Math.round(kcalTarget * 0.20 / 4);
  const fTarget = Math.round(kcalTarget * 0.25 / 9);
  const cTarget = Math.round(kcalTarget * 0.55 / 4);
  const fibTarget = 18;
  const sugars = Math.max(0, c - fib);
  const sTarget = Math.max(1, cTarget - fibTarget);
  const pct = (val, tgt) => Math.min(Math.round(val / tgt * 100), 100);

  const totalKcal = meals.reduce((sum, m) => sum + (m.kcal || 0), 0);
  const chk = (val, tgt, mode) => mode === "min"
    ? (val >= tgt * 0.8 ? "good" : val >= tgt * 0.5 ? "warn" : "bad")
    : (val <= tgt ? "good" : val <= tgt * 1.2 ? "warn" : "bad");
  const cp   = chk(p,      pTarget, "min");
  const cf   = chk(f,      fTarget, "max");
  const cs   = chk(sugars, sTarget, "max");
  const cfib = fib >= 15 ? "good" : fib >= 8 ? "warn" : "bad";
  const ckcal = totalKcal <= kcalTarget ? "good" : totalKcal <= kcalTarget * 1.1 ? "warn" : "bad";
  const goods = [cp, cf, cs, cfib, ckcal].filter(c => c === "good").length;

  const badge = (chk) => {
    const sym = chk === "good" ? "◎" : chk === "warn" ? "△" : "×";
    return `<span class="diet-badge diet-badge--${chk}">${sym}</span>`;
  };
  let verdictText, verdictCls;
  if (goods >= 4)      { verdictText = "今日は痩せやすいバランス！";      verdictCls = "verdict-great"; }
  else if (goods === 3){ verdictText = "惜しい！あと少しで理想バランス"; verdictCls = "verdict-good";  }
  else if (goods === 2){ verdictText = "もう少し意識してみよう";           verdictCls = "verdict-warn";  }
  else                 { verdictText = "今日の食事を見直してみよう";       verdictCls = "verdict-bad";   }

  el.innerHTML = `
    <div class="slim-verdict ${verdictCls}">${verdictText}</div>
    <div class="nutrition-row">
      <div class="nutrition-label">
        <span class="nutrition-name protein-label">${badge(cp)}たんぱく質</span>
        <span class="nutrition-val">${p.toFixed(1)}g <span class="nutrition-target">/ 目安${pTarget}g以上</span></span>
      </div>
      <div class="nutrition-bar-bg"><div class="nutrition-bar protein-bar" style="width:${pct(p,pTarget)}%"></div></div>
    </div>
    <div class="nutrition-row">
      <div class="nutrition-label">
        <span class="nutrition-name fat-label">${badge(cf)}脂質</span>
        <span class="nutrition-val">${f.toFixed(1)}g <span class="nutrition-target">/ 目安${fTarget}g以内</span></span>
      </div>
      <div class="nutrition-bar-bg"><div class="nutrition-bar fat-bar" style="width:${pct(f,fTarget)}%"></div></div>
    </div>
    <div class="nutrition-row">
      <div class="nutrition-label">
        <span class="nutrition-name carbs-label">炭水化物</span>
        <span class="nutrition-val">${c.toFixed(1)}g <span class="nutrition-target">/ 目安${cTarget}g</span></span>
      </div>
      <div class="nutrition-bar-bg"><div class="nutrition-bar carbs-bar" style="width:${pct(c,cTarget)}%"></div></div>
    </div>
    <div class="nutrition-row">
      <div class="nutrition-label">
        <span class="nutrition-name sugars-label">${badge(cs)}糖質</span>
        <span class="nutrition-val">${sugars.toFixed(1)}g <span class="nutrition-target">/ 目安${sTarget}g以内</span></span>
      </div>
      <div class="nutrition-bar-bg"><div class="nutrition-bar sugars-bar" style="width:${pct(sugars,sTarget)}%"></div></div>
    </div>
    <div class="nutrition-row">
      <div class="nutrition-label">
        <span class="nutrition-name fiber-label">${badge(cfib)}食物繊維</span>
        <span class="nutrition-val">${fib.toFixed(1)}g <span class="nutrition-target">/ 目標${fibTarget}g以上</span></span>
      </div>
      <div class="nutrition-bar-bg"><div class="nutrition-bar fiber-bar" style="width:${pct(fib,fibTarget)}%"></div></div>
    </div>`;

  const category = p < pTarget * 0.5 ? "nutrition_low_protein"
    : fib < 6 ? "nutrition_low_fiber"
    : "nutrition_balanced";

  adviceEl.innerHTML = `
    <div class="mini-partner">
      <img class="mini-icon" src="${PARTNERS.kaoru.icon}" alt="${PARTNERS.kaoru.name}" onerror="this.src='images/placeholder-kaoru.svg'" />
      <div class="partner-body">
        <div class="partner-name">${PARTNERS.kaoru.name}</div>
        <div class="speech-bubble">${pickLine(PARTNERS.kaoru, category)}</div>
      </div>
    </div>
    <div class="mini-partner" style="margin-top:8px">
      <img class="mini-icon" src="${PARTNERS.kasumi.icon}" alt="${PARTNERS.kasumi.name}" onerror="this.src='images/placeholder-kasumi.svg'" />
      <div class="partner-body">
        <div class="partner-name">${PARTNERS.kasumi.name}</div>
        <div class="speech-bubble kasumi">${pickLine(PARTNERS.kasumi, category)}</div>
      </div>
    </div>`;
}

// ---------- コンディション ----------
function renderCondition() {
  const records = loadRecords();
  const dateStr = document.getElementById("date-input").value || todayStr();
  const r = records[dateStr] || {};

  const hasWeight = r.weight != null;
  const hasExercise = r.exercises?.length > 0;
  const hasMeals = r.meals?.length > 0;

  const el = document.getElementById("condition-display");

  if (!hasWeight && !hasExercise && !hasMeals) {
    el.innerHTML = `<div class="condition-status neutral">記録してみよう</div>
      <div class="condition-note">体重・運動・食事を記録すると表示されます</div>`;
    return;
  }

  const intake = hasMeals ? r.meals.reduce((s, m) => s + m.kcal, 0) : null;
  const burned = hasExercise
    ? r.exercises.reduce((s, e) => s + (normalizeExercise(e).kcal || 0), 0)
    : 0;
  const target = getKcalTarget();

  let status = "neutral";
  let message = "";
  let note = "";

  if (hasMeals && hasExercise) {
    if (intake <= target) {
      status = "good"; message = "いい調子！";
      note = `食事${intake}kcal・運動${burned}kcal消費、ナイスバランス`;
    } else {
      status = "caution"; message = "食べすぎかも";
      note = `${intake - target}kcalオーバー。運動は頑張った！`;
    }
  } else if (hasMeals) {
    if (intake <= target) {
      status = "good"; message = "食事OK！";
      note = "カロリー目標内。運動も少し意識してみよ";
    } else {
      status = "caution"; message = "食べすぎかも";
      note = `${intake - target}kcalオーバー。明日巻き返そう`;
    }
  } else if (hasExercise) {
    status = "good"; message = "運動ナイス！";
    note = `${burned}kcal消費。食事も記録すると収支がわかるよ`;
  } else {
    status = "neutral"; message = "体重記録済み";
    note = "運動・食事も記録してみよう";
  }

  el.innerHTML = `<div class="condition-status ${status}">${message}</div>
    <div class="condition-note">${note}</div>`;
}

// ---------- グラフ ----------
let chartInstance = null;
function renderChart(range = "7") {
  const records = loadRecords();
  const profile = loadProfile();
  const all = Object.entries(records)
    .filter(([, r]) => r.weight != null)
    .sort((a, b) => a[0].localeCompare(b[0]));

  let filtered = all;
  if (range !== "all") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(range) + 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    filtered = all.filter(([d]) => d >= cutoffStr);
  }

  const labels = filtered.map(([d]) => d.slice(5));
  const data = filtered.map(([, r]) => r.weight);

  const datasets = [{
    label: "体重 (kg)",
    data,
    borderColor: "#e88aa1",
    backgroundColor: "rgba(245,163,182,0.2)",
    tension: 0.3,
    fill: true,
    pointBackgroundColor: "#e88aa1",
    pointRadius: 4,
  }];

  if (profile.targetWeight && labels.length > 0) {
    datasets.push({
      label: "目標体重",
      data: labels.map(() => profile.targetWeight),
      borderColor: "#7cb8d8",
      borderDash: [6, 4],
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  const ctx = document.getElementById("weight-chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: !!profile.targetWeight } },
      scales: {
        y: { ticks: { color: "#8a7c83" }, grid: { color: "#f0e1e7" } },
        x: { ticks: { color: "#8a7c83" }, grid: { display: false } },
      },
    },
  });
}

// ---------- 履歴 ----------
function renderHistory() {
  const records = loadRecords();
  const list = document.getElementById("history-list");
  const entries = Object.entries(records).sort((a, b) => b[0].localeCompare(a[0]));

  if (!entries.length) {
    list.innerHTML = '<p style="color:#8a7c83;font-size:13px;text-align:center;padding:20px 0">まだ記録がありません</p>';
    return;
  }

  list.innerHTML = entries.slice(0, 50).map(([date, r]) => {
    const parts = [];
    if (r.weight != null) parts.push(`体重 ${r.weight}kg`);

    let burnedKcal = 0;
    if (r.exercises?.length > 0) {
      const exList = r.exercises.map(e => {
        const norm = normalizeExercise(e);
        const ul = norm.unit === "rep" ? "回" : "分";
        if (norm.kcal) burnedKcal += norm.kcal;
        return `${norm.name}(${norm.value}${ul})`;
      });
      parts.push(`運動 ${exList.join("、")}`);
    }

    let intakeKcal = 0;
    if (r.meals?.length > 0) {
      r.meals.forEach(m => { intakeKcal += m.kcal; });
      parts.push(`食事 ${intakeKcal}kcal`);
    }

    const sub = [];
    if (burnedKcal > 0) sub.push(`消費 約${burnedKcal}kcal`);
    if (intakeKcal > 0) sub.push(`摂取 ${intakeKcal}kcal`);
    const subHtml = sub.length ? `<div class="history-kcal">${sub.join(" / ")}</div>` : "";

    return `<div class="history-item">
      <div class="history-date">${formatDateJa(date)}</div>
      <div class="history-detail">${parts.join(" / ") || "—"}</div>
      ${subHtml}
    </div>`;
  }).join("");
}

// ---------- 統計タブ まとめ ----------
function renderStatsTab() {
  renderChart(document.querySelector(".range-btn.active")?.dataset.range || "7");
  renderStreak();
  renderWeightDiff();
  renderCalorieBalance();
  renderNutritionBalance();
  renderCondition();
  renderHistory();
}

// ---------- マイ情報フォーム ----------
function loadProfileForm() {
  const p = loadProfile();
  if (p.height) document.getElementById("profile-height").value = p.height;
  if (p.targetWeight) document.getElementById("profile-target").value = p.targetWeight;
  if (p.kcalTarget) document.getElementById("profile-kcal").value = p.kcalTarget;
}

function saveProfileForm() {
  const height = parseFloat(document.getElementById("profile-height").value);
  const targetWeight = parseFloat(document.getElementById("profile-target").value);
  const kcalTarget = parseInt(document.getElementById("profile-kcal").value);
  const p = loadProfile();
  if (!isNaN(height) && height > 0) p.height = height;
  if (!isNaN(targetWeight) && targetWeight > 0) p.targetWeight = targetWeight;
  if (!isNaN(kcalTarget) && kcalTarget > 0) p.kcalTarget = kcalTarget;
  saveProfile(p);
  updateCalorieBar();

  const msg = document.getElementById("profile-saved-msg");
  msg.textContent = "保存しました！";
  setTimeout(() => { msg.textContent = ""; }, 2000);

  renderChart(document.querySelector(".range-btn.active")?.dataset.range || "7");
  renderProfileSummary();
}

function autoCalcKcalTarget() {
  const weight = getCurrentWeight() || 60;
  const p = loadProfile();
  const height = p.height || parseFloat(document.getElementById("profile-height").value) || 168;
  const bmr = 10 * weight + 6.25 * height - 5 * 30 - 161;
  document.getElementById("profile-kcal").value = Math.round(bmr * 1.375 - 350);
}

function renderProfileSummary() {
  const p = loadProfile();
  const records = loadRecords();
  const latestEntry = Object.entries(records)
    .filter(([, r]) => r.weight != null)
    .sort((a, b) => b[0].localeCompare(a[0]))[0];
  const latestWeight = latestEntry?.[1].weight ?? null;

  const bmi = (p.height && latestWeight)
    ? (latestWeight / Math.pow(p.height / 100, 2)).toFixed(1) : null;
  const diff = (p.targetWeight && latestWeight)
    ? (latestWeight - p.targetWeight) : null;

  const el = document.getElementById("profile-summary");
  if (!latestWeight && !p.height && !p.targetWeight) {
    el.innerHTML = '<p class="summary-empty">基本情報を入力して保存してください</p>';
    return;
  }

  let boxes = "";
  if (latestWeight) boxes += summaryBox("最新の体重", latestWeight, "kg", "");
  if (p.targetWeight) boxes += summaryBox("目標体重", p.targetWeight, "kg", "");
  if (diff !== null) {
    const sign = diff > 0 ? "+" : "";
    boxes += summaryBox("目標まで", sign + diff.toFixed(1), "kg", diff <= 0 ? "good" : "caution");
  }
  if (p.height) boxes += summaryBox("身長", p.height, "cm", "");
  if (bmi) boxes += summaryBox("BMI", bmi, "", bmi < 18.5 ? "caution" : bmi < 25 ? "good" : "caution");
  if (p.kcalTarget) boxes += summaryBox("カロリー目標", p.kcalTarget, "kcal/日", "");

  el.innerHTML = `<div class="summary-grid">${boxes}</div>`;
}

function summaryBox(label, value, unit, cls) {
  return `<div class="summary-box">
    <div class="label">${label}</div>
    <div class="value ${cls}">${value}<span class="unit">${unit}</span></div>
  </div>`;
}

// ---------- エクスポート／インポート ----------
function exportData() {
  const blob = new Blob([localStorage.getItem(STORAGE_KEY) || "{}"], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `saya-diet-${todayStr()}.json`; a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (typeof data !== "object") throw new Error();
      if (!confirm("現在のデータを上書きします。続けますか？")) return;
      saveRecords(data);
      loadDateData(document.getElementById("date-input").value);
      renderStatsTab();
      alert("読み込みました！");
    } catch { alert("ファイルを読み込めませんでした"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}
