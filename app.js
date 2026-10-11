/* さやのダイエット記録 v2
 * 既存の体重・プロフィールキーは変更せず、身体サイズのみ別キーで追加。
 * 旧食事／運動の保存済みデータは削除しない（画面上では使用しない）。
 */
const STORAGE_KEY = 'saya-diet-records';
const PROFILE_KEY = 'saya-diet-profile';
const SIZE_KEY = 'saya-diet-measurements';

const BODY_PARTS = [
  { id: 'shoulder', label: '肩幅', side: 'left', top: 110 },
  { id: 'upperArm', label: '二の腕', side: 'right', top: 163 },
  { id: 'bust', label: 'バストトップ', side: 'left', top: 194 },
  { id: 'underBust', label: 'アンダーバスト', side: 'right', top: 242 },
  { id: 'forearm', label: '前腕', side: 'left', top: 276 },
  { id: 'waist', label: 'くびれ', side: 'right', top: 326 },
  { id: 'belly', label: 'お腹（へそ下3cm）', side: 'left', top: 360 },
  { id: 'hips', label: 'おしり', side: 'right', top: 411 },
  { id: 'thighUpper', label: '太もも（付け根）', side: 'left', top: 463 },
  { id: 'thighMiddle', label: '太もも（真ん中）', side: 'right', top: 500 },
  { id: 'calf', label: 'ふくらはぎ（真ん中）', side: 'left', top: 562 },
  { id: 'ankle', label: '足首', side: 'right', top: 614 },
];

const $ = (id) => document.getElementById(id);
function readObject(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
function loadRecords() { return readObject(STORAGE_KEY); }
function saveRecords(value) { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); }
function loadProfile() { return readObject(PROFILE_KEY); }
function saveProfile(value) { localStorage.setItem(PROFILE_KEY, JSON.stringify(value)); }
function loadMeasurements() { return readObject(SIZE_KEY); }
function saveMeasurements(value) { localStorage.setItem(SIZE_KEY, JSON.stringify(value)); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatDateJa(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [y,m,d] = date.split('-');
  return `${y}年${Number(m)}月${Number(d)}日`;
}
function localCutoff(days) {
  const date = new Date();
  date.setHours(12,0,0,0);
  date.setDate(date.getDate() - days + 1);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const [y,m,d] = value.split('-').map(Number);
  const test = new Date(y, m-1, d);
  return test.getFullYear() === y && test.getMonth() === m-1 && test.getDate() === d;
}
function validNumber(value, max) { return Number.isFinite(value) && value > 0 && value <= max; }
function showMessage(id, text) {
  $(id).textContent = text;
}
function niceNumber(value) { return Number(value).toFixed(1); }
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

window.addEventListener('DOMContentLoaded', () => {
  initTabs();
  $('date-input').value = todayStr();
  $('size-date-input').value = todayStr();
  initBodyFields();
  fillSizeChartSelect();
  bindEvents();
  loadDateData(todayStr());
  loadSizeDateData(todayStr());
  loadProfileForm();
  renderWeightDiff();
  renderHistory();
  renderSizeHistory();
});

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const selected = btn.dataset.tab === tab;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  document.querySelectorAll('.tab-content').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tab}`);
  });
  if (tab === 'stats') renderStatsTab();
  if (tab === 'measurements') { renderSizeChart(); renderSizeHistory(); requestAnimationFrame(drawBodyGuides); }
  if (tab === 'profile') renderProfileSummary();
}
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}
function bindEvents() {
  $('date-input').addEventListener('change', e => loadDateData(e.target.value));
  $('save-weight-btn').addEventListener('click', saveWeight);
  ['period-check','after-dinner-check'].forEach(id => {
    $(id).addEventListener('change', saveWeightFlags);
  });
  document.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.range-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderWeightChart(btn.dataset.range);
    });
  });
  $('size-date-input').addEventListener('change', e => loadSizeDateData(e.target.value));
  $('save-size-btn').addEventListener('click', saveSizeEntry);
  $('size-chart-part').addEventListener('change', renderSizeChart);
  document.querySelectorAll('.size-range-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.size-range-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderSizeChart();
    });
  });
  $('save-profile-btn').addEventListener('click', saveProfileForm);
  $('export-btn').addEventListener('click', exportData);
  $('import-btn').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', importData);
}

// ===== 体重 =====
function loadDateData(date) {
  if (!validDate(date)) return;
  const record = loadRecords()[date] || {};
  $('weight-input').value = record.weight ?? '';
  $('period-check').checked = !!record.period;
  $('after-dinner-check').checked = !!record.afterDinner;
  $('partner-comment-weight').hidden = true;
}
function saveWeightFlags() {
  const date = $('date-input').value;
  if (!validDate(date)) return;
  const records = loadRecords();
  // 元々記録のない日にはチェックだけでもレコードを作成する。
  const record = records[date] && typeof records[date] === 'object' ? records[date] : {};
  if ($('period-check').checked) record.period = true;
  else delete record.period;
  if ($('after-dinner-check').checked) record.afterDinner = true;
  else delete record.afterDinner;
  if (Object.keys(record).length) records[date] = record;
  else delete records[date];
  saveRecords(records);
  renderHistory();
}
function getWeightDiff(records, date, weight) {
  const previous = Object.entries(records)
    .filter(([d,r]) => d < date && r && Number.isFinite(Number(r.weight)) && Number(r.weight) > 0)
    .sort((a,b) => b[0].localeCompare(a[0]))[0];
  return previous ? Number(weight) - Number(previous[1].weight) : null;
}
function saveWeight() {
  const date = $('date-input').value;
  const value = Number($('weight-input').value);
  if (!validDate(date)) return alert('日付を入れてね');
  if (!$('weight-input').value.trim() || !validNumber(value, 500)) return alert('正しい体重を入力してね');
  const records = loadRecords();
  const first = !Object.values(records).some(r => r && validNumber(Number(r.weight), 500));
  const record = records[date] && typeof records[date] === 'object' ? records[date] : {};
  record.weight = value;
  if ($('period-check').checked) record.period = true;
  else delete record.period;
  if ($('after-dinner-check').checked) record.afterDinner = true;
  else delete record.afterDinner;
  records[date] = record;
  try { saveRecords(records); }
  catch { alert('体重を保存できませんでした。保存容量を確認してね。'); return; }
  const diff = getWeightDiff(records,date,value);
  const category = first ? 'first_record' : diff === null ? 'default' : diff <= -0.05 ? 'weight_decreased' : diff >= 0.05 ? 'weight_increased' : 'weight_same';
  showInlineWeightComment(category, diff === null ? null : Math.abs(diff).toFixed(1));
  renderWeightDiff();
  renderHistory();
}
function pickLine(partner,category,n) {
  const lines = partner.lines[category] || partner.lines.default || [''];
  return lines[Math.floor(Math.random()*lines.length)].replace(/\{n\}/g,n ?? '');
}
function showInlineWeightComment(category,n) {
  $('inline-kaoru-weight').textContent = pickLine(PARTNERS.kaoru,category,n);
  $('inline-kasumi-weight').textContent = pickLine(PARTNERS.kasumi,category,n);
  $('partner-comment-weight').hidden = false;
}
function weightEntries() {
  return Object.entries(loadRecords())
    .filter(([d,r]) => validDate(d) && r && validNumber(Number(r.weight),500))
    .sort((a,b) => a[0].localeCompare(b[0]));
}
function renderWeightDiff() {
  const entries = weightEntries();
  if (entries.length < 2) {
    $('weight-diff-display').innerHTML = '<p class="stat-empty">体重を2回記録すると表示されます</p>';
    return;
  }
  const [previous,latest] = entries.slice(-2);
  const diff = Number(latest[1].weight) - Number(previous[1].weight);
  const label = diff < -0.05 ? '減った！' : diff > 0.05 ? '増えた' : '変わらず';
  const cls = diff < -0.05 ? 'good' : diff > 0.05 ? 'caution' : '';
  $('weight-diff-display').innerHTML = `<div class="weight-diff-value ${cls}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}<span class="unit">kg</span> <span style="font-size:14px;font-weight:normal">${label}</span></div><p class="weight-diff-sub">${formatDateJa(previous[0])} → ${formatDateJa(latest[0])}</p>`;
}
let weightChartInstance = null;
function renderWeightChart(range = '7') {
  const all = weightEntries();
  const shown = range === 'all' ? all : all.filter(([date]) => date >= localCutoff(Number(range)));
  const labels = shown.map(([date]) => date.slice(5));
  const points = shown.map(([,record]) => Number(record.weight));
  const periodFlags = shown.map(([,record]) => !!record.period);
  const afterDinnerFlags = shown.map(([,record]) => !!record.afterDinner);
  const profile = loadProfile();
  const target = Number(profile.targetWeight);
  if (typeof Chart === 'undefined') {
    $('weight-chart-fallback').hidden = false;
    return;
  }
  $('weight-chart-fallback').hidden = true;
  if (weightChartInstance) weightChartInstance.destroy();
  const periodPlugin = {
    id: 'periodBand',
    beforeDatasetsDraw(chart) {
      if (!periodFlags.some(Boolean)) return;
      const {ctx,chartArea,scales:{x}} = chart;
      if (!chartArea || !x) return;
      const half = periodFlags.length > 1 ? Math.abs(x.getPixelForValue(1)-x.getPixelForValue(0))/2 : x.width/2;
      periodFlags.forEach((flag,i) => {
        if (!flag) return;
        ctx.save();ctx.fillStyle='rgba(212,112,162,.13)';ctx.fillRect(x.getPixelForValue(i)-half,chartArea.top,half*2,chartArea.bottom-chartArea.top);ctx.restore();
      });
    }
  };
  const dinnerPlugin = {
    id: 'afterDinnerEmoji',
    afterDatasetsDraw(chart) {
      const {ctx,scales:{x,y}}=chart;
      afterDinnerFlags.forEach((flag,i) => {
        if (!flag) return;
        ctx.save();ctx.font='13px sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
        ctx.fillText('🍽',x.getPixelForValue(i),y.getPixelForValue(points[i])-6);ctx.restore();
      });
    }
  };
  const datasets = [{
    label:'体重 (kg)', data:points, borderColor:'#e88aa1', backgroundColor:'rgba(245,163,182,.2)',
    fill:true, tension:.3, pointBackgroundColor:periodFlags.map(p=>p?'#d470a2':'#e88aa1'),
    pointRadius:periodFlags.map(p=>p?6:4),pointBorderWidth:1.5
  }];
  if (validNumber(target,500) && labels.length) datasets.push({label:'目標体重',data:labels.map(()=>target),borderColor:'#7cb8d8',borderDash:[6,4],borderWidth:2,pointRadius:0,fill:false,tension:0});
  weightChartInstance = new Chart($('weight-chart'),{
    type:'line',data:{labels,datasets},plugins:[periodPlugin,dinnerPlugin],
    options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:datasets.length>1},tooltip:{callbacks:{afterLabel:context => {
        if (context.datasetIndex!==0) return '';
        const idx=context.dataIndex;
        return [periodFlags[idx]?'🌸 生理中':'',afterDinnerFlags[idx]?'🍽 夕食後に測定':''].filter(Boolean).join(' / ');
      }}}},
      scales:{y:{ticks:{color:'#8a7c83'},grid:{color:'#f0e1e7'}},x:{ticks:{color:'#8a7c83',maxTicksLimit:7},grid:{display:false}}}
    }
  });
}
function renderHistory() {
  const entries = weightEntries().reverse().slice(0,50);
  if (!entries.length) {
    $('history-list').innerHTML = '<p class="stat-empty">まだ体重の記録がありません</p>';
    return;
  }
  $('history-list').innerHTML = entries.map(([date,r]) => `<div class="history-item">
    <div class="history-date">${formatDateJa(date)}${r.period?'<span class="period-badge">🌸</span>':''}${r.afterDinner?'<span class="after-dinner-badge">🍽</span>':''}</div>
    <div class="history-detail">体重 ${escapeHtml(r.weight)}kg</div>
  </div>`).join('');
}
function renderStatsTab(){renderWeightDiff();renderWeightChart(document.querySelector('.range-btn.active')?.dataset.range||'7');renderHistory();}

// ===== 身体サイズ =====
// Body landmark locations relative to the illustrated body map.
const BODY_LANDMARKS = {'shoulder': [59, 150], 'upperArm': [65, 202], 'bust': [44, 218], 'underBust': [55, 252], 'forearm': [35, 330], 'waist': [55, 315], 'belly': [48, 356], 'hips': [59, 397], 'thighUpper': [44, 450], 'thighMiddle': [56, 513], 'calf': [45, 591], 'ankle': [54, 659]};
function drawBodyGuides() {
  const map = document.querySelector('.body-map');
  const svg = $('body-guide-lines');
  if (!map || !svg) return;
  const mapBox = map.getBoundingClientRect();
  if (!mapBox.width) return;
  const width = mapBox.width;
  svg.setAttribute('viewBox', `0 0 ${width} 710`);
  svg.innerHTML = BODY_PARTS.map(part => {
    const field = $('size-' + part.id)?.closest('.measure-field');
    if (!field) return '';
    const r = field.getBoundingClientRect();
    const x1 = part.side === 'left' ? r.right - mapBox.left : r.left - mapBox.left;
    const y1 = part.top + 24;
    const [px, y2] = BODY_LANDMARKS[part.id];
    const x2 = width * px / 100;
    const bend = part.side === 'left' ? Math.min(x1 + 10, x2) : Math.max(x1 - 10, x2);
    return `<polyline points="${x1},${y1} ${bend},${y1} ${x2},${y2}" />` +
      `<circle cx="${x2}" cy="${y2}" r="2.8" />`;
  }).join('');
}

function initBodyFields() {
  $('measurement-fields').innerHTML = BODY_PARTS.map(part => `<label class="measure-field ${part.side}" style="top:${part.top}px" for="size-${part.id}">
    <span class="measure-label">${part.label}</span>
    <span class="measure-input-wrap"><input id="size-${part.id}" type="number" inputmode="decimal" min="0.1" max="400" step="0.1" placeholder="—" aria-label="${part.label}（cm）" /><span>cm</span></span>
  </label>`).join('');
}
function fillSizeChartSelect() {
  $('size-chart-part').innerHTML = BODY_PARTS.map(part => `<option value="${part.id}">${part.label}</option>`).join('');
  $('size-chart-part').value = 'waist';
}
function loadSizeDateData(date) {
  if (!validDate(date)) return;
  const entry = loadMeasurements()[date] || {};
  BODY_PARTS.forEach(part => { $('size-'+part.id).value = entry[part.id] ?? ''; });
  showMessage('size-saved-msg','');
}
function collectSizeInputs() {
  const entry = {};
  for (const part of BODY_PARTS) {
    const input = $('size-'+part.id);
    if (!input.value.trim()) continue;
    const num = Number(input.value);
    if (!validNumber(num,400) || Math.abs(num*10-Math.round(num*10))>1e-7) {
      alert(`${part.label}は0より大きい数値を小数第1位まで入力してね`);
      input.focus();
      return null;
    }
    entry[part.id]=num;
  }
  return entry;
}
function saveSizeEntry() {
  const date = $('size-date-input').value;
  if (!validDate(date)) return alert('測定日を入力してね');
  const values = collectSizeInputs();
  if (values === null) return;
  if (!Object.keys(values).length) return alert('少なくとも1つの部位を入力してね');
  const all = loadMeasurements();
  const existing = all[date];
  if (existing && Object.keys(existing).length && !confirm(`${formatDateJa(date)}のサイズ記録を更新する？\n空欄になっている部位は記録から外れます。`)) return;
  all[date] = values;
  try { saveMeasurements(all); }
  catch { alert('身体サイズを保存できませんでした。保存容量を確認してね。'); return; }
  showMessage('size-saved-msg','保存しました ♡');
  renderSizeChart();
  renderSizeHistory();
}
function sizeEntries(partId) {
  return Object.entries(loadMeasurements())
    .filter(([date,values]) => validDate(date) && values && typeof values==='object' && !Array.isArray(values) && (partId ? validNumber(Number(values[partId]),400) : BODY_PARTS.some(p=>validNumber(Number(values[p.id]),400))))
    .sort((a,b)=>a[0].localeCompare(b[0]));
}
let sizeChartInstance = null;
function renderSizeChart() {
  const id = $('size-chart-part').value;
  const part = BODY_PARTS.find(p=>p.id===id) || BODY_PARTS[0];
  const all = sizeEntries(part.id);
  const range = document.querySelector('.size-range-btn.active')?.dataset.sizeRange || '90';
  const shown = range==='all'?all:all.filter(([date])=>date>=localCutoff(Number(range)));
  const labels = shown.map(([date])=>date.slice(2).replace(/-/g,'/'));
  const values = shown.map(([,entry])=>Number(entry[part.id]));
  renderSizeComparison(all,part.label);
  if (typeof Chart === 'undefined') { $('size-chart-fallback').hidden=false;return; }
  $('size-chart-fallback').hidden=true;
  if (sizeChartInstance) sizeChartInstance.destroy();
  sizeChartInstance=new Chart($('size-chart'),{
    type:'line',
    data:{labels,datasets:[{label:`${part.label} (cm)`,data:values,borderColor:'#c88eae',backgroundColor:'rgba(200,142,174,.15)',fill:true,tension:.22,pointRadius:5,pointHoverRadius:7,pointBackgroundColor:'#e88aa1',spanGaps:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${part.label}: ${niceNumber(ctx.parsed.y)}cm`}}},
      scales:{x:{grid:{display:false},ticks:{color:'#8a7c83',maxTicksLimit:6}},y:{grid:{color:'#f0e1e7'},ticks:{color:'#8a7c83',callback:value=>value+'cm'}}}}
  });
}
function renderSizeComparison(all,label) {
  if (!all.length) {
    $('size-comparison').innerHTML='<p class="stat-empty">まだこの部位の記録がありません</p>';
    return;
  }
  const recent=all[all.length-1];
  const prev=all.length>=2?all[all.length-2]:null;
  const first=all.length>=2?all[0]:null;
  const partId = $('size-chart-part').value;
  const value = Number(recent[1][partId]);
  const block=(title,base)=>{
    if (!base) return `<div class="comparison-box"><div class="label">${title}</div><div class="value">—</div></div>`;
    const diff=value-Number(base[1][partId]);
    return `<div class="comparison-box"><div class="label">${title}</div><div class="value ${diff<0?'down':diff>0?'up':''}">${diff>0?'+':''}${niceNumber(diff)}<span class="unit">cm</span></div></div>`;
  };
  $('size-comparison').innerHTML=`<p class="stat-empty" style="padding:2px 0 9px">最新：${niceNumber(value)}cm（${formatDateJa(recent[0])}）</p><div class="size-comparison-grid">${block('前回との差',prev)}${block('初回との差',first)}</div>`;
}
function renderSizeHistory() {
  const entries=sizeEntries().reverse();
  const box=$('size-history');
  if (!entries.length) {box.innerHTML='<p class="stat-empty">まだサイズの記録がありません</p>';return;}
  box.innerHTML=entries.map(([date,record])=>{
    const values=BODY_PARTS.filter(p=>validNumber(Number(record[p.id]),400)).map(p=>`${p.label} ${niceNumber(record[p.id])}cm`);
    return `<div class="history-item"><div class="history-date">${formatDateJa(date)}</div>
      <div class="history-detail">${values.join(' / ')}</div>
      <div class="size-history-actions"><button class="small-btn edit-size" type="button" data-date="${date}">編集</button><button class="small-btn danger delete-size" type="button" data-date="${date}">削除</button></div></div>`;
  }).join('');
  box.querySelectorAll('.edit-size').forEach(btn=>btn.addEventListener('click',()=>{
    const date=btn.dataset.date;
    $('size-date-input').value=date;
    loadSizeDateData(date);
    $('tab-measurements').scrollIntoView({behavior:'smooth',block:'start'});
  }));
  box.querySelectorAll('.delete-size').forEach(btn=>btn.addEventListener('click',()=>{
    const date=btn.dataset.date;
    if (!confirm(`${formatDateJa(date)}の身体サイズ記録を削除する？\nこの操作は元に戻せません。`)) return;
    const all=loadMeasurements();delete all[date];saveMeasurements(all);
    if ($('size-date-input').value===date) loadSizeDateData(date);
    renderSizeHistory();renderSizeChart();
  }));
}

// ===== マイ情報 =====
function loadProfileForm() {
  const profile=loadProfile();
  $('profile-height').value=profile.height??'';
  $('profile-target').value=profile.targetWeight??'';
}
function saveProfileForm() {
  const heightStr=$('profile-height').value.trim();
  const targetStr=$('profile-target').value.trim();
  const height=Number(heightStr);
  const target=Number(targetStr);
  if (heightStr && !validNumber(height,300)) return alert('身長を正しく入力してね');
  if (targetStr && !validNumber(target,500)) return alert('目標体重を正しく入力してね');
  const profile=loadProfile();
  if (heightStr) profile.height=height;else delete profile.height;
  if (targetStr) profile.targetWeight=target;else delete profile.targetWeight;
  // 旧プロフィール内の kcalTarget は互換性のため内部データに残すが画面では使わない。
  try {saveProfile(profile);}catch{return alert('マイ情報を保存できませんでした');}
  showMessage('profile-saved-msg','保存しました ♡');
  renderProfileSummary();
}
function renderProfileSummary() {
  const profile=loadProfile();
  const latest=weightEntries().slice(-1)[0];
  const weight=latest?Number(latest[1].weight):null;
  const height=Number(profile.height);
  const target=Number(profile.targetWeight);
  const blocks=[];
  if (weight!==null) blocks.push(summaryBox('最新の体重',niceNumber(weight),'kg'));
  if (validNumber(target,500)) blocks.push(summaryBox('目標体重',niceNumber(target),'kg'));
  if (weight!==null && validNumber(target,500)){
    const diff=weight-target;
    blocks.push(summaryBox('目標まで',(diff>0?'+':'')+niceNumber(diff),'kg',diff<=0?'good':'caution'));
  }
  if (validNumber(height,300)) blocks.push(summaryBox('身長',niceNumber(height),'cm'));
  if (weight!==null && validNumber(height,300)){
    const bmi=weight/(height/100)**2;
    blocks.push(summaryBox('BMI',niceNumber(bmi),'',bmi>=18.5&&bmi<25?'good':'caution'));
  }
  $('profile-summary').innerHTML=blocks.length?`<div class="summary-grid">${blocks.join('')}</div>`:'<p class="summary-empty">体重や基本情報を記録すると表示されます</p>';
}
function summaryBox(label,value,unit,cls=''){
  return `<div class="summary-box"><div class="label">${label}</div><div class="value ${cls}">${value}<span class="unit">${unit}</span></div></div>`;
}

// ===== 旧JSON互換のバックアップ =====
function exportData() {
  const bundle={app:'saya-diet',version:2,exportedAt:new Date().toISOString(),records:loadRecords(),measurements:loadMeasurements(),profile:loadProfile()};
  const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');anchor.href=url;anchor.download=`saya-diet-backup-${todayStr()}.json`;
  document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function isPlainRecord(value) {
  return value!==null && typeof value==='object' && !Array.isArray(value);
}
function validateImportedRecords(value) {
  if (!isPlainRecord(value)) return false;
  return Object.entries(value).every(([date,record])=>validDate(date) && isPlainRecord(record));
}
function validateImportedMeasurements(value) {
  if (!isPlainRecord(value)) return false;
  return Object.entries(value).every(([date,record])=>validDate(date)&&isPlainRecord(record)&&
    Object.entries(record).every(([name,num])=>BODY_PARTS.some(p=>p.id===name)&&validNumber(Number(num),400)));
}
async function importData(event) {
  const file=event.target.files?.[0];
  event.target.value='';
  if (!file) return;
  try {
    const data=JSON.parse(await file.text());
    const modern=data && data.app==='saya-diet' && data.version===2 && 'records' in data;
    const records=modern?data.records:data;
    if (!validateImportedRecords(records)) throw new Error('記録の形式が違うようです');
    if (modern && (!validateImportedMeasurements(data.measurements)||!isPlainRecord(data.profile))) throw new Error('サイズ・マイ情報の形式が違うようです');
    const message=modern
      ? '現在の体重・身体サイズ・マイ情報を、このバックアップの内容に置き換えます。\n先に現在のJSONを書き出しましたか？'
      : '以前の形式のJSONです。体重記録を置き換えます。\n現在の身体サイズ・マイ情報はそのまま残します。\n先に現在のJSONを書き出しましたか？';
    if (!confirm(message)) return;
    const old=[localStorage.getItem(STORAGE_KEY),localStorage.getItem(SIZE_KEY),localStorage.getItem(PROFILE_KEY)];
    try {
      saveRecords(records);
      if (modern) {saveMeasurements(data.measurements);saveProfile(data.profile);}
    }catch(error){
      [STORAGE_KEY,SIZE_KEY,PROFILE_KEY].forEach((key,i)=>old[i]===null?localStorage.removeItem(key):localStorage.setItem(key,old[i]));
      throw error;
    }
    loadDateData($('date-input').value);
    loadSizeDateData($('size-date-input').value);
    loadProfileForm();
    renderWeightDiff();renderHistory();renderSizeHistory();renderSizeChart();renderProfileSummary();
    alert('読み込みました！');
  }catch(error){alert('読み込めませんでした。'+(error?.message||'JSONを確認してね'));}
}
