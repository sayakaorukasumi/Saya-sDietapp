// =============================================================
//  メインロジック
//  データは localStorage に "saya-diet-records" として保存
//  形式: { "YYYY-MM-DD": { weight: 52.3, exercises: [{name, minutes}] } }
// =============================================================

const STORAGE_KEY = "saya-diet-records";
const LAST_LINE_KEY = "saya-diet-last-context";

// ---------- データ操作 ----------
function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateJa(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return `${y}年${parseInt(m)}月${parseInt(d)}日`;
}

// ---------- 一時的な運動リスト（保存前） ----------
let pendingExercises = [];

// ---------- 初期化 ----------
document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initExerciseSelect();
  initDateInput();
  loadDateData(todayStr());
  bindEvents();
  renderAll();
});

function initHeader() {
  const today = new Date();
  document.getElementById("today-label").textContent =
    `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
}

function initExerciseSelect() {
  const sel = document.getElementById("exercise-select");
  sel.innerHTML = EXERCISE_OPTIONS.map(
    (e) => `<option value="${e}">${e}</option>`
  ).join("");
}

function initDateInput() {
  document.getElementById("date-input").value = todayStr();
}

function bindEvents() {
  document.getElementById("date-input").addEventListener("change", (e) => {
    loadDateData(e.target.value);
  });

  document.getElementById("add-exercise").addEventListener("click", () => {
    const name = document.getElementById("exercise-select").value;
    const minutes = parseInt(document.getElementById("exercise-minutes").value);
    if (!name || !minutes || minutes <= 0) {
      alert("運動の種類と分数を入れてね");
      return;
    }
    pendingExercises.push({ name, minutes });
    document.getElementById("exercise-minutes").value = "";
    renderExerciseList();
  });

  document.getElementById("save-btn").addEventListener("click", saveToday);

  document.getElementById("refresh-lines").addEventListener("click", () => {
    showPartnerLines(getLatestContext(), true);
  });

  document.querySelectorAll(".range-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".range-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderChart(btn.dataset.range);
    });
  });

  document.getElementById("export-btn").addEventListener("click", exportData);
  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file").addEventListener("change", importData);
}

// ---------- 日付ごとのデータ表示 ----------
function loadDateData(dateStr) {
  const records = loadRecords();
  const record = records[dateStr];
  document.getElementById("weight-input").value = record?.weight ?? "";
  pendingExercises = record?.exercises ? [...record.exercises] : [];
  renderExerciseList();
}

function renderExerciseList() {
  const ul = document.getElementById("exercise-list");
  ul.innerHTML = pendingExercises
    .map(
      (e, i) =>
        `<li><span>${e.name} - ${e.minutes}分</span>
         <button class="remove" data-i="${i}" aria-label="削除">×</button></li>`
    )
    .join("");
  ul.querySelectorAll(".remove").forEach((b) => {
    b.addEventListener("click", () => {
      pendingExercises.splice(parseInt(b.dataset.i), 1);
      renderExerciseList();
    });
  });
}

// ---------- 保存 ----------
function saveToday() {
  const dateStr = document.getElementById("date-input").value;
  const weight = parseFloat(document.getElementById("weight-input").value);
  if (!dateStr) {
    alert("日付を入れてね");
    return;
  }

  const records = loadRecords();
  const prevRecord = records[dateStr];
  const isFirstEver = Object.keys(records).length === 0;

  const newRecord = {};
  if (!isNaN(weight)) newRecord.weight = weight;
  if (pendingExercises.length > 0) newRecord.exercises = [...pendingExercises];

  if (Object.keys(newRecord).length === 0) {
    if (prevRecord) {
      // 全削除
      delete records[dateStr];
      saveRecords(records);
      renderAll();
      alert("記録を削除しました");
    } else {
      alert("体重か運動、どちらかを入れてね");
    }
    return;
  }

  records[dateStr] = newRecord;
  saveRecords(records);

  // パートナーセリフ用のコンテキスト
  const context = buildContext(records, dateStr, prevRecord, newRecord, isFirstEver);
  localStorage.setItem(LAST_LINE_KEY, JSON.stringify(context));

  renderAll();
  showPartnerLines(context, true);
}

// ---------- パートナーセリフのコンテキスト判定 ----------
function buildContext(records, dateStr, prevRecord, newRecord, isFirstEver) {
  if (isFirstEver) return { category: "first_record" };

  const ctx = { category: "default", n: null };

  // 過去の体重を遡って比較対象を探す
  if (newRecord.weight != null) {
    const previousWeights = Object.entries(records)
      .filter(([d, r]) => d < dateStr && r.weight != null)
      .sort((a, b) => b[0].localeCompare(a[0]));
    if (previousWeights.length > 0) {
      const prevW = previousWeights[0][1].weight;
      const diff = newRecord.weight - prevW;
      if (diff <= -0.1) {
        ctx.category = "weight_decreased";
        ctx.n = Math.abs(diff).toFixed(1);
      } else if (diff >= 0.1) {
        ctx.category = "weight_increased";
        ctx.n = diff.toFixed(1);
      } else {
        ctx.category = "weight_same";
      }
    }
  }

  // 運動が記録されていれば、運動カテゴリを優先（体重よりも嬉しい瞬間）
  if (newRecord.exercises && newRecord.exercises.length > 0) {
    // ただし「体重が増えた」場合は、増えた方を伝える方が大事なので残す
    if (ctx.category !== "weight_increased") {
      const totalMin = newRecord.exercises.reduce((s, e) => s + e.minutes, 0);
      ctx.category = "exercise_done";
      ctx.n = totalMin;
    }
  }

  // 連続日数の節目
  const streak = calcStreak(records, dateStr);
  const milestones = [3, 7, 14, 30, 60, 100, 200, 365];
  if (milestones.includes(streak) && newRecord.exercises?.length > 0) {
    ctx.category = "streak_milestone";
    ctx.n = streak;
  }

  return ctx;
}

function getLatestContext() {
  try {
    return JSON.parse(localStorage.getItem(LAST_LINE_KEY)) || { category: "default" };
  } catch {
    return { category: "default" };
  }
}

// ---------- パートナーセリフ表示 ----------
function pickLine(partner, category, n) {
  const lines = partner.lines[category] || partner.lines.default || [""];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace(/\{n\}/g, n ?? "");
}

function showPartnerLines(context, animate = false) {
  const ctx = context || { category: "default" };
  const kaoruLine = pickLine(PARTNERS.kaoru, ctx.category, ctx.n);
  const kasumiLine = pickLine(PARTNERS.kasumi, ctx.category, ctx.n);

  const kaoruEl = document.getElementById("speech-kaoru");
  const kasumiEl = document.getElementById("speech-kasumi");

  if (animate) {
    kaoruEl.style.animation = "none";
    kasumiEl.style.animation = "none";
    void kaoruEl.offsetWidth;
    void kasumiEl.offsetWidth;
    kaoruEl.style.animation = "";
    kasumiEl.style.animation = "";
  }

  kaoruEl.textContent = kaoruLine;
  kasumiEl.textContent = kasumiLine;
}

// ---------- 連続日数の計算 ----------
function calcStreak(records, fromDateStr = todayStr()) {
  let streak = 0;
  const cursor = new Date(fromDateStr);
  while (true) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getDate()).padStart(2, "0");
    const key = `${yyyy}-${mm}-${dd}`;
    const r = records[key];
    if (r && r.exercises && r.exercises.length > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ---------- グラフ ----------
let chartInstance = null;
function renderChart(range = "7") {
  const records = loadRecords();
  const allEntries = Object.entries(records)
    .filter(([, r]) => r.weight != null)
    .sort((a, b) => a[0].localeCompare(b[0]));

  let filtered = allEntries;
  if (range !== "all") {
    const days = parseInt(range);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    filtered = allEntries.filter(([d]) => d >= cutoffStr);
  }

  const labels = filtered.map(([d]) => d.slice(5));
  const data = filtered.map(([, r]) => r.weight);

  const ctx = document.getElementById("weight-chart").getContext("2d");
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "体重 (kg)",
          data,
          borderColor: "#e88aa1",
          backgroundColor: "rgba(245,163,182,0.2)",
          tension: 0.3,
          fill: true,
          pointBackgroundColor: "#e88aa1",
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          ticks: { color: "#8a7c83" },
          grid: { color: "#f0e1e7" },
        },
        x: {
          ticks: { color: "#8a7c83" },
          grid: { display: false },
        },
      },
    },
  });
}

// ---------- 連続日数の表示 ----------
function renderStreak() {
  const records = loadRecords();
  const streak = calcStreak(records);
  document.getElementById("streak-number").textContent = streak;
  const sub = document.getElementById("streak-sub");
  if (streak === 0) {
    sub.textContent = "今日運動して、新しい連続記録をスタート！";
  } else if (streak < 7) {
    sub.textContent = "いい調子！この調子で続けよう";
  } else if (streak < 30) {
    sub.textContent = "もう習慣になってきてる！";
  } else {
    sub.textContent = "すごい継続力…！本当にお疲れさま";
  }
}

// ---------- 履歴表示 ----------
function renderHistory() {
  const records = loadRecords();
  const list = document.getElementById("history-list");
  const entries = Object.entries(records).sort((a, b) => b[0].localeCompare(a[0]));

  if (entries.length === 0) {
    list.innerHTML = '<p style="color:#8a7c83;font-size:13px;text-align:center;padding:20px 0">まだ記録がありません</p>';
    return;
  }

  list.innerHTML = entries
    .slice(0, 50)
    .map(([date, r]) => {
      const parts = [];
      if (r.weight != null) parts.push(`体重 ${r.weight}kg`);
      if (r.exercises && r.exercises.length > 0) {
        const total = r.exercises.reduce((s, e) => s + e.minutes, 0);
        const names = r.exercises.map((e) => `${e.name}(${e.minutes}分)`).join(", ");
        parts.push(`運動 計${total}分 - ${names}`);
      }
      return `<div class="history-item">
        <div class="history-date">${formatDateJa(date)}</div>
        <div class="history-detail">${parts.join(" / ") || "—"}</div>
      </div>`;
    })
    .join("");
}

// ---------- データのエクスポート／インポート ----------
function exportData() {
  const data = localStorage.getItem(STORAGE_KEY) || "{}";
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `saya-diet-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (typeof data !== "object") throw new Error();
      if (!confirm("現在のデータを上書きします。続けますか？")) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      renderAll();
      loadDateData(document.getElementById("date-input").value);
      alert("読み込みました！");
    } catch {
      alert("ファイルを読み込めませんでした");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

// ---------- まとめて再描画 ----------
function renderAll() {
  renderChart(document.querySelector(".range-btn.active")?.dataset.range || "7");
  renderStreak();
  renderHistory();
  showPartnerLines(getLatestContext(), false);
}
