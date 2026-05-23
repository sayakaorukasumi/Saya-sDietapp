const STORAGE_KEY  = "saya-diet-records";
const LAST_LINE_KEY = "saya-diet-last-context";
const PROFILE_KEY  = "saya-diet-profile";

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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDateJa(s) {
  const [y,m,d] = s.split("-");
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

function normalizeExercise(ex) {
  if (ex.value != null) return ex;
  return { name: ex.name, value: ex.minutes, unit: "min", kcal: ex.kcal ?? null };
}

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

let pendingExercises = [];
let currentUnit = "min";

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initTabs();
  initExerciseSelect();
  initUnitToggle();
  initDateInput();
  loadDateData(todayStr());
  bindEvents();
  loadProfileForm();
  renderAll();
});

function initHeader() {
  const d = new Date();
  document.getElementById("today-label").textContent =
    `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      if (btn.dataset.tab === "profile") renderProfileSummary();
    });
  });
}

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

function initExerciseSelect() {
  const sel = document.getElementById("exercise-select");
  sel.innerHTML = EXERCISE_OPTIONS.map(e =>
    `<option value="${e.name}">${e.name}</option>`).join("");
  sel.addEventListener("change", () => {
    const def = EXERCISE_OPTIONS.find(e => e.name === sel.value);
    if (def) { currentUnit = def.defaultUnit; updateUnitUI(); }
  });
}

function initDateInput() {
  document.getElementById("date-input").value = todayStr();
}

function bindEvents() {
  document.getElementById("date-input").addEventListener("change", e => loadDateData(e.target.value));

  document.getElementById("add-exercise").addEventListener("click", () => {
    const name    = document.getElementById("exercise-select").value;
    const value   = parseInt(document.getElementById("exercise-value").value);
    if (!name || !value || value <= 0) { alert("種目と数値を入れてね"); return; }
    const weight  = getCurrentWeight();
    const kcal    = calcKcal({ name, value, unit: currentUnit }, weight);
    pendingExercises.push({ name, value, unit: currentUnit, kcal });
    document.getElementById("exercise-value").value = "";
    renderExerciseList();
  });

  document.getElementById("save-btn").addEventListener("click", saveToday);
  document.getElementById("refresh-lines").addEventListener("click", () =>
    showPartnerLines(getLatestContext(), true));

  document.querySelectorAll(".range-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".range-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderChart(btn.dataset.range);
    });
  });

  document.getElementById("save-profile-btn").addEventListener("click", saveProfileForm);
  document.getElementById("export-btn").addEventListener("click", exportData);
  document.getElementById("import-btn").addEventListener("click", () =>
    document.getElementById("import-file").click());
  document.getElementById("import-file").addEventListener("change", importData);
}

function loadDateData(dateStr) {
  const r = loadRecords()[dateStr];
  document.getElementById("weight-input").value = r?.weight ?? "";
  pendingExercises = r?.exercises ? r.exercises.map(normalizeExercise) : [];
  renderExerciseList();
}

function renderExerciseList() {
  const weight = getCurrentWeight();
  const ul = document.getElementById("exercise-list");
  ul.innerHTML = pendingExercises.map((e, i) => {
    const unitLabel = e.unit === "rep" ? "回" : "分";
    const kcal = e.kcal ?? calcKcal(e, weight);
    const kcalHtml = kcal != null
      ? `<span class="kcal-badge">約${kcal}kcal</span>` : "";
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

function saveToday() {
  const dateStr = document.getElementById("date-input").value;
  const weight  = parseFloat(document.getElementById("weight-input").value);
  if (!dateStr) { alert("日付を入れてね"); return; }

  const records    = loadRecords();
  const prevRecord = records[dateStr];
  const isFirstEver = Object.keys(records).length === 0;

  const newRecord = {};
  if (!isNaN(weight) && weight > 0) newRecord.weight = weight;
  if (pendingExercises.length > 0) {
    const w = (!isNaN(weight) && weight > 0) ? weight : getCurrentWeight();
    newRecord.exercises = pendingExercises.map(e => ({
      ...e, kcal: e.kcal ?? calcKcal(e, w),
    }));
  }

  if (Object.keys(newRecord).length === 0) {
    if (prevRecord) {
      delete records[dateStr]; saveRecords(records); renderAll();
      alert("記録を削除しました");
    } else {
      alert("体重か運動、どちらかを入れてね");
    }
    return;
  }

  records[dateStr] = newRecord;
  saveRecords(records);

  const context = buildContext(records, dateStr, prevRecord, newRecord, isFirstEver);
  localStorage.setItem(LAST_LINE_KEY, JSON.stringify(context));
  renderAll();
  showPartnerLines(context, true);
}

function buildContext(records, dateStr, prevRecord, newRecord, isFirstEver) {
  if (isFirstEver) return { category: "first_record" };
  const ctx = { category: "default", n: null };

  if (newRecord.weight != null) {
    const prevWeights = Object.entries(records)
      .filter(([d,r]) => d < dateStr && r.weight != null)
      .sort((a,b) => b[0].localeCompare(a[0]));
    if (prevWeights.length) {
      const diff = newRecord.weight - prevWeights[0][1].weight;
      if (diff <= -0.1)      { ctx.category = "weight_decreased"; ctx.n = Math.abs(diff).toFixed(1); }
      else if (diff >= 0.1)  { ctx.category = "weight_increased"; ctx.n = diff.toFixed(1); }
      else                   { ctx.category = "weight_same"; }
    }
  }

  if (newRecord.exercises?.length > 0 && ctx.category !== "weight_increased") {
    const totalMin = newRecord.exercises.reduce((s,e) => s + (e.unit === "rep" ? 0 : e.value), 0);
    ctx.category = "exercise_done";
    ctx.n = totalMin || newRecord.exercises.reduce((s,e) => s + e.value, 0);
  }

  const streak = calcStreak(records, dateStr);
  const milestones = [3,7,14,30,60,100,200,365];
  if (milestones.includes(streak) && newRecord.exercises?.length > 0) {
    ctx.category = "streak_milestone"; ctx.n = streak;
  }
  return ctx;
}

function getLatestContext() {
  try { return JSON.parse(localStorage.getItem(LAST_LINE_KEY)) || { category: "default" }; }
  catch { return { category: "default" }; }
}

function pickLine(partner, category, n) {
  const lines = partner.lines[category] || partner.lines.default || [""];
  return lines[Math.floor(Math.random() * lines.length)].replace(/\{n\}/g, n ?? "");
}

function showPartnerLines(context, animate = false) {
  const ctx = context || { category: "default" };
  const kEl = document.getElementById("speech-kaoru");
  const cEl = document.getElementById("speech-kasumi");
  if (animate) {
    [kEl, cEl].forEach(el => { el.style.animation="none"; void el.offsetWidth; el.style.animation=""; });
  }
  kEl.textContent = pickLine(PARTNERS.kaoru,  ctx.category, ctx.n);
  cEl.textContent = pickLine(PARTNERS.kasumi, ctx.category, ctx.n);
}

function calcStreak(records, fromDateStr = todayStr()) {
  let streak = 0;
  const cursor = new Date(fromDateStr);
  while (true) {
    const key = cursor.toISOString().slice(0,10);
    const r = records[key];
    if (r?.exercises?.length > 0) { streak++; cursor.setDate(cursor.getDate()-1); }
    else break;
  }
  return streak;
}

function renderStreak() {
  const streak = calcStreak(loadRecords());
  document.getElementById("streak-number").textContent = streak;
  const sub = document.getElementById("streak-sub");
  if      (streak === 0)  sub.textContent = "今日運動して、新しい連続記録をスタート！";
  else if (streak < 7)    sub.textContent = "いい調子！この調子で続けよう";
  else if (streak < 30)   sub.textContent = "もう習慣になってきてる！";
  else                    sub.textContent = "すごい継続力…！本当にお疲れさま";
}

let chartInstance = null;
function renderChart(range = "7") {
  const records = loadRecords();
  const profile = loadProfile();
  const all = Object.entries(records)
    .filter(([,r]) => r.weight != null)
    .sort((a,b) => a[0].localeCompare(b[0]));

  let filtered = all;
  if (range !== "all") {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(range) + 1);
    const cutoffStr = cutoff.toISOString().slice(0,10);
    filtered = all.filter(([d]) => d >= cutoffStr);
  }

  const labels = filtered.map(([d]) => d.slice(5));
  const data   = filtered.map(([,r]) => r.weight);

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
        y: { ticks: { color:"#8a7c83" }, grid: { color:"#f0e1e7" } },
        x: { ticks: { color:"#8a7c83" }, grid: { display: false } },
      },
    },
  });
}

function renderHistory() {
  const records = loadRecords();
  const list = document.getElementById("history-list");
  const entries = Object.entries(records).sort((a,b) => b[0].localeCompare(a[0]));

  if (!entries.length) {
    list.innerHTML = '<p style="color:#8a7c83;font-size:13px;text-align:center;padding:20px 0">まだ記録がありません</p>';
    return;
  }

  list.innerHTML = entries.slice(0,50).map(([date,r]) => {
    const parts = [];
    if (r.weight != null) parts.push(`体重 ${r.weight}kg`);
    let kcalTotal = 0;
    if (r.exercises?.length > 0) {
      const exList = r.exercises.map(e => {
        const norm = normalizeExercise(e);
        if (norm.kcal) kcalTotal += norm.kcal;
        return `${norm.name}(${norm.value}${norm.unit==="rep"?"回":"分"})`;
      });
      parts.push(`運動 ${exList.join("、")}`);
    }
    const kcalHtml = kcalTotal > 0
      ? `<div class="history-kcal">消費カロリー 約${kcalTotal}kcal</div>` : "";
    return `<div class="history-item">
      <div class="history-date">${formatDateJa(date)}</div>
      <div class="history-detail">${parts.join(" / ") || "—"}</div>
      ${kcalHtml}
    </div>`;
  }).join("");
}

function loadProfileForm() {
  const p = loadProfile();
  if (p.height)       document.getElementById("profile-height").value = p.height;
  if (p.targetWeight) document.getElementById("profile-target").value = p.targetWeight;
}

function saveProfileForm() {
  const height       = parseFloat(document.getElementById("profile-height").value);
  const targetWeight = parseFloat(document.getElementById("profile-target").value);
  const p = loadProfile();
  if (!isNaN(height) && height > 0)             p.height = height;
  if (!isNaN(targetWeight) && targetWeight > 0) p.targetWeight = targetWeight;
  saveProfile(p);
  const msg = document.getElementById("profile-saved-msg");
  msg.textContent = "保存しました！";
  setTimeout(() => { msg.textContent = ""; }, 2000);
  renderChart(document.querySelector(".range-btn.active")?.dataset.range || "7");
  renderProfileSummary();
}

function renderProfileSummary() {
  const p = loadProfile();
  const latestEntry = Object.entries(loadRecords())
    .filter(([,r]) => r.weight != null)
    .sort((a,b) => b[0].localeCompare(a[0]))[0];
  const latestWeight = latestEntry?.[1].weight ?? null;
  const bmi = (p.height && latestWeight)
    ? (latestWeight / Math.pow(p.height/100, 2)).toFixed(1) : null;
  const diff = (p.targetWeight && latestWeight)
    ? (latestWeight - p.targetWeight) : null;

  const el = document.getElementById("profile-summary");
  if (!latestWeight && !p.height && !p.targetWeight) {
    el.innerHTML = '<p class="summary-empty">基本情報を入力して保存してください</p>';
    return;
  }

  let boxes = "";
  if (latestWeight)   boxes += summaryBox("最新の体重", latestWeight, "kg", "");
  if (p.targetWeight) boxes += summaryBox("目標体重", p.targetWeight, "kg", "");
  if (diff !== null) {
    boxes += summaryBox("目標まで", (diff > 0 ? "+" : "") + diff.toFixed(1), "kg", diff <= 0 ? "good" : "caution");
  }
  if (p.height) boxes += summaryBox("身長", p.height, "cm", "");
  if (bmi)      boxes += summaryBox("BMI", bmi, "", bmi < 18.5 || bmi >= 25 ? "caution" : "good");
  el.innerHTML = `<div class="summary-grid">${boxes}</div>`;
}

function summaryBox(label, value, unit, cls) {
  return `<div class="summary-box">
    <div class="label">${label}</div>
    <div class="value ${cls}">${value}<span class="unit">${unit}</span></div>
  </div>`;
}

function exportData() {
  const blob = new Blob([localStorage.getItem(STORAGE_KEY) || "{}"], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
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
      saveRecords(data); renderAll();
      loadDateData(document.getElementById("date-input").value);
      alert("読み込みました！");
    } catch { alert("ファイルを読み込めませんでした"); }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function renderAll() {
  renderChart(document.querySelector(".range-btn.active")?.dataset.range || "7");
  renderStreak();
  renderHistory();
  showPartnerLines(getLatestContext(), false);
}
