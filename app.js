const STANDARD_ROUTES = {
  fat_single: {
    40:[["S20","S20"],["D20"]],
    50:[["BULL"]],
    60:[["S20","S20","S20"]],
    65:[["BULL","S15"]],
    70:[["T18","S16"]],
    72:[["T20","S12"],["T16","S20","S4"]],
    80:[["T20","S20"]],
    90:[["BULL","S20","S20"]],
    91:[["T17","S20","S20"]],
    100:[["BULL","BULL"]]
  },
  fat_master: {
    40:[["D20"]],
    50:[["BULL"]],
    60:[["T20"]],
    65:[["S15","BULL"]],
    70:[["S20","BULL"]],
    72:[["T12","D18"],["T16","D12"]],
    80:[["BULL","D15"]],
    90:[["BULL","D20"]],
    91:[["T17","D20"]],
    100:[["BULL","BULL"]]
  },
  sep_double: {
    24:[["D12"]],
    32:[["D16"]],
    40:[["D20"]],
    60:[["S20","D20"]],
    65:[["SB","D20"]],
    70:[["T18","D8"]],
    72:[["T16","D12"],["T12","D18"]],
    80:[["T20","D10"]],
    90:[["T20","D15"]],
    91:[["T17","D20"]],
    100:[["T20","D20"]]
  }
};

let checkoutData = [];
let checkoutByScore = new Map();

async function loadCheckoutData(){
  try{
    const res = await fetch("./darts_checkout_2_180_do_mo.json", {cache:"no-cache"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    checkoutData = await res.json();
    checkoutByScore = new Map(checkoutData.filter(x => Number.isInteger(x.score)).map(x=>[x.score, x]));
  }catch(err){
    console.warn("Checkout JSON could not be loaded; using built-in routes only.", err);
  }
}

const Core = PracticeCore;
const PROGRESS_KEY = 'darts_progress_v1';
const SETTINGS_KEY = 'darts_settings_v1';
let progress = readProgress();
let resultReceipt = null;
let answerShown = false;
let targetPractice = false;
let activeScreen = 'practice';
let mistakesPage = 0;
let sequenceKey = '';
let sequenceScore = null;
let savedPage = 0;
let startScore = 0;
let currentScore = 0;
let throws = [];
let history = [];
let lastStatus = {type:'info', text:'入力途中', detail:'3本以内でちょうど 0 にし、最後の1本が現在のアウト条件を満たすと成功です。'}

function currentMode(){
  return document.querySelector('input[name="mode"]:checked').value;
}
function currentModeLabel(){
  const map = {
    fat_single:'ファットブル・シングルアウト',
    fat_master:'ファットブル・マスターアウト',
    sep_double:'セパレートブル・ダブルアウト'
  };
  return map[currentMode()];
}
function updateModeChips(){
  document.querySelectorAll('#modeSelector .chip').forEach(chip=>{
    chip.classList.remove('active');
    if(chip.querySelector('input').checked) chip.classList.add('active');
  });
}
function tokenClass(token){
  if(token === 'MISS') return 'M';
  if(token === 'BULL' || token === 'SB') return 'B';
  return token[0];
}
function standardRoutes(score){
  const mode = currentMode();
  const row = checkoutByScore.get(Number(score));
  const item = mode === 'sep_double' ? row?.doubleOut : row?.masterOutFatBull;
  if(mode !== 'fat_single' && Array.isArray(item?.route)) {
    const route = item.route.map(Core.normalize);
    if(Core.validRoute(score, route, mode)) return [route];
  }
  const builtIn = (STANDARD_ROUTES[mode]?.[score] || []).filter(r => Core.validRoute(score, r, mode));
  if(builtIn.length) return builtIn;
  const generated = Core.generatedRoute(score, mode);
  return generated ? [generated] : [];
}

function isValidToken(token){ return Core.validToken(token, currentMode()); }

function getCustomStore(){
  const raw = readStorage('darts_custom_routes_v6', {});
  const clean = {};
  for(const mode of Core.MODES){
    clean[mode] = {};
    for(const [score, routes] of Object.entries(raw?.[mode] || {})){
      if(!Number.isInteger(Number(score)) || Number(score) < 2 || Number(score) > 180 || !Array.isArray(routes)) continue;
      clean[mode][score] = routes.filter(r => Core.validRoute(Number(score), r, mode));
    }
  }
  return clean;
}

function setCustomStore(data){ return writeStorage('darts_custom_routes_v6', data); }

function customRoutes(score){
  const store = getCustomStore();
  const mode = currentMode();
  return ((store[mode] || {})[String(score)]) || [];
}
function routeEquals(a,b){
  if(a.length !== b.length) return false;
  for(let i=0;i<a.length;i++){
    if(a[i] !== b[i]) return false;
  }
  return true;
}
function updateExplanation(){
  document.getElementById('explainTitle').textContent = `${startScore}点の組み立て`;
  const route=standardRoutes(startScore)[0];
  let text='回答後に表示します。';
  if(answerShown){
    if(!route) text='現在のルールでは3本以内に上がれない点数です。';
    else {
      const last=route.at(-1), finish=Core.value(last);
      text=route.length===1 ? `${Dartboard.label(last)}で直接上がれます。` : `${route.slice(0,-1).join(' → ')}で${startScore-finish}点を取り、${finish}点を残す例です。最後は${Dartboard.label(last)}。`;
    }
  }
  document.getElementById('explainText').textContent=text;
}
function updateRoutes(){
  if(!answerShown && !resultReceipt){ document.getElementById('routeArea').textContent = '「回答する」を押すと候補を表示します。'; return; }
  const standard = standardRoutes(startScore);
  const custom = customRoutes(startScore);
  const area = document.getElementById('routeArea');
  let html = '';
  if(standard.length){
    html += `<div class="routeGroup"><div class="routeGroupTitle">候補例</div>`;
    html += standard.map(r=>`<div class="routeItem">${r.join(' → ')}</div>`).join('');
    html += `</div>`;
  }else{
    html += `<div class="routeGroup"><div class="routeGroupTitle">候補例</div><div class="routeItem">候補未登録</div></div>`;
  }

  if(custom.length){
    html += `<div class="routeGroup"><div class="routeGroupTitle">自分登録</div>`;
    html += custom.map(r=>`<div class="routeItem">${r.join(' → ')}</div>`).join('');
    html += `</div>`;
  }else{
    html += `<div class="routeGroup"><div class="routeGroupTitle">自分登録</div><div class="routeItem">まだ登録はありません</div></div>`;
  }
  area.innerHTML = html;
}
function setStatus(type,text,detail){
  lastStatus = {type,text,detail};
  document.querySelector('.resultBox').dataset.status = type;
  document.getElementById('resultText').textContent = text;
  document.getElementById('resultDetail').textContent = detail;
}
function updateThrows(){
  const area = document.getElementById('throws');
  if(!throws.length){
    area.innerHTML = '<div class="chip">まだ入力はありません</div>';
  }else{
    area.innerHTML = throws.map(t=>`<span class="throwChip ${tokenClass(t)}">${t}</span>`).join('');
  }
  document.getElementById('throwCount').textContent = throws.length;
}
function updateScores(){
  document.getElementById('currentScore').textContent = currentScore;
  document.getElementById('startScore').textContent = startScore;
  document.getElementById('inputStartScore').textContent = startScore;
  document.getElementById('inputCurrentScore').textContent = currentScore;
  document.getElementById('inputThrowCount').textContent = throws.length;
}
function updateAll(){
  updateModeChips();
  document.getElementById('quickMode').value = currentMode();
  document.getElementById('activeModeLabel').textContent = {fat_single:'シングルアウト',fat_master:'マスターアウト',sep_double:'ダブルアウト'}[currentMode()];
  updateScores();
  updateThrows();
  updateRoutes();
  updateExplanation();
  updateStats();
  const locked = !!resultReceipt || Core.outcome(startScore, throws, currentMode()).done;
  document.querySelectorAll('.dartBtn').forEach(b => { b.disabled = locked; });
  Dartboard.update(document.getElementById('dartboardHost'), currentMode(), locked, throws.at(-1));
  document.getElementById('boardHint').textContent = throws.length ? Dartboard.label(throws.at(-1)) : '狙う場所をタップ';
  document.getElementById('submitAnswer').disabled = !!resultReceipt || !throws.length;
  document.getElementById('impossibleAnswer').disabled = !!resultReceipt;
  updateMissPlans();
}
function newGame(){
  const min = Number(document.getElementById('rangeMin').value);
  const max = Number(document.getElementById('rangeMax').value);
  const pool = Core.candidates(min, max, currentMode());
  if(!pool.length){
    document.getElementById('rangeMessage').textContent = '2〜180の範囲を指定してください。このルールで3本以内に上がれる点数が必要です。';
    return;
  }
  const review = document.getElementById('reviewPriority').checked;
  const sequential = document.getElementById('questionOrder').value === 'sequential';
  const key = `${currentMode()}:${min}:${max}`;
  if(key !== sequenceKey){ sequenceKey = key; sequenceScore = null; }
  const next = sequential ? Core.nextSequential(pool, sequenceScore) : Core.select(pool, progress[currentMode()] || {}, review, startScore);
  if(sequential) sequenceScore = next;
  const omitted = max - min + 1 - pool.length;
  document.getElementById('rangeMessage').textContent = `${pool.length}種類から出題${omitted ? `（3本で上がれない${omitted}点数を除外）` : ''}。`;
  saveSettings();
  targetPractice = false;
  document.getElementById('targetMessage').textContent = '';
  beginQuestion(next);
}
function beginQuestion(score){
  resultReceipt = null;
  answerShown = false;
  startScore = score;
  document.querySelectorAll('.selectedHit').forEach(el=>el.classList.remove('selectedHit'));
  document.getElementById('boardHint').textContent = '狙う場所をタップ';
  currentScore = score;
  throws = [];
  history = [];
  setStatus('info','入力途中','ルートを入力して「回答する」で答え合わせします。');
  updateAll(); showStandardAnswer();
  showScreen('practice');
}
const scoreBands = [[2,20],[21,40],[41,60],[61,80],[81,100],[101,120],[121,140],[141,160],[161,180]];
function showScoreBand(index){
  const [min,max] = scoreBands[index];
  document.querySelectorAll('#scoreBands button').forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  const choices = document.getElementById('scoreChoices');
  choices.textContent = '';
  for(let score=min;score<=max;score++){
    const button = document.createElement('button');
    button.className = 'btn btnSoft';
    button.textContent = score;
    button.onclick = ()=>{
      startTargetPractice(score);
      document.getElementById('scorePicker').close();
      showScreen('practice');
    };
    choices.appendChild(button);
  }
}
function openScorePicker(){
  const bands = document.getElementById('scoreBands');
  if(!bands.children.length){
    scoreBands.forEach(([min,max],index)=>{
      const button = document.createElement('button');
      button.className = 'btn btnSoft';
      button.textContent = `${min}〜${max}`;
      button.onclick = ()=>showScoreBand(index);
      bands.appendChild(button);
    });
  }
  const index = scoreBands.findIndex(([min,max])=>startScore>=min && startScore<=max);
  showScoreBand(index<0 ? 0 : index);
  document.getElementById('scorePicker').showModal();
}
function startTargetPractice(score){
  if(!Number.isInteger(score) || score < 2 || score > 180){
    document.getElementById('targetMessage').textContent = '2〜180の整数を指定してください。'; return;
  }
  targetPractice = true;
  document.getElementById('targetMessage').textContent = `${score}点を練習中。3本で上がれないと思ったら、その回答を選んでください。`;
  beginQuestion(score);
}

function clearThrows(){
  retractResult();
  showScreen('practice');
  answerShown = false;
  currentScore = startScore;
  throws = [];
  history = [];
  setStatus('info','入力途中','入力をリセットしました。');
  updateAll(); showStandardAnswer();
}
function undoThrow(){
  if(!history.length){ if(resultReceipt){ retractResult(); showScreen('practice'); answerShown = false; setStatus('info','未回答','回答を取り消しました。'); updateAll(); showStandardAnswer(); } return; }
  retractResult();
  showScreen('practice');
  answerShown = false;
  const back = history.pop();
  currentScore = back.prevScore;
  throws.pop();
  if(throws.length === 0){
    setStatus('info','入力途中','1投戻しました。');
  }else{
    setStatus('warn','入力途中','1投戻しました。残り ' + currentScore + ' 点です。');
  }
  updateAll(); showStandardAnswer();
}
function showStandardAnswer(){
  const el = document.getElementById('standardAnswer');
  if(!answerShown && !resultReceipt){ el.textContent = '「回答する」を押すと表示されます'; return; }
  const routes = standardRoutes(startScore);
  el.textContent = routes.length ? routes.map(r=>r.join(' → ')).join(' / ') : 'この点数は3本以内で上がれません';
}

function addThrow(token){
  if(resultReceipt || throws.length >= 3 || !isValidToken(token) || Core.outcome(startScore, throws, currentMode()).done) return;
  history.push({prevScore: currentScore});
  throws.push(token);
  document.getElementById('boardHint').textContent = Dartboard.label(token);
  currentScore = Core.outcome(startScore, throws, currentMode()).remaining;
  setStatus('info','未回答', '入力を確認して「回答する」を押してください。');
  updateAll(); showStandardAnswer();
}
function submitAnswer(impossible = false){
  if(resultReceipt) return;
  if(!impossible && !throws.length){ setStatus('warn','未入力','ルートを入力するか「3本で上がれない」を選んでください。'); return; }
  const result = Core.outcome(startScore, throws, currentMode());
  const canFinish = !!Core.generatedRoute(startScore, currentMode());
  const correct = impossible ? !canFinish : result.correct;
  recordResult(correct);
  answerShown = true;
  if(correct){
    setStatus('ok', '正解', impossible ? 'この点数は3本以内では上がれません。' : '成績に記録しました。');
  }else{
    const detail = impossible ? 'この点数には3本以内の上がり目があります。' : result.reason === 'bust' ? 'バーストです。' : result.reason === 'finish-rule' ? '最後のアウト条件を満たしていません。' : '入力したルートでは上がりきれていません。';
    setStatus('bad','不正解',detail + ' 復習対象に保存しました。');
  }
  updateAll(); showStandardAnswer();
  document.getElementById('resultQuestion').textContent = `出題 ${startScore}点 / ${currentModeLabel()}`;
  document.getElementById('submittedRoute').textContent = impossible ? 'あなたの回答：3本で上がれない' : 'あなたの回答：' + throws.join(' → ');
  showScreen('result');
}

function saveCustomRoute(){
  const score = Number(document.getElementById('customScore').value);
  const raw = document.getElementById('customRoute').value.trim();
  const tokens = raw.split(',').map(s=>Core.normalize(s.trim().toUpperCase())).filter(Boolean);
  const message = document.getElementById('customMessage');
  if(!Number.isInteger(score) || score < 2 || score > 180 || !Core.validRoute(score, tokens, currentMode())){
    message.textContent = '2〜180点、3本以内、合計点と現在のアウト条件を満たすルートを入力してください。';
    return;
  }
  const store = getCustomStore();
  const mode = currentMode();
  if(!store[mode][score]) store[mode][score] = [];
  if(!store[mode][score].some(r=>routeEquals(r,tokens))) store[mode][score].push(tokens);
  if(!setCustomStore(store)){ message.textContent = '保存できませんでした。端末の保存設定を確認してください。'; return; }
  document.getElementById('customScore').value = '';
  document.getElementById('customRoute').value = '';
  message.textContent = 'このルールの候補に保存しました。';
  updateSavedList(); updateRoutes();
}

function updateSavedList(){
  const store = getCustomStore();
  const mode = currentMode();
  const data = store[mode] || {};
  const entries = Object.entries(data).sort((a,b)=>Number(b[0])-Number(a[0])).flatMap(([score,routes])=>routes.map(route=>({score,route})));
  const total = Math.max(1,Math.ceil(entries.length/2));
  savedPage = Math.max(0,Math.min(total-1,savedPage));
  const area = document.getElementById('savedList');
  area.textContent = '';
  for(const {score,route} of entries.slice(savedPage*2,savedPage*2+2)){
    const item = document.createElement('div');
    item.className = 'savedItem';
    item.textContent = `${score}点: ${route.join(' → ')}`;
    area.appendChild(item);
  }
  if(!entries.length) area.textContent = '登録なし';
  document.getElementById('savedPosition').textContent = `${savedPage+1} / ${total}`;
  document.getElementById('previousSaved').disabled = savedPage===0;
  document.getElementById('nextSaved').disabled = savedPage===total-1;
}
function changeSaved(delta){savedPage += delta; updateSavedList();}

function buildButtons(){
  Dartboard.mount(document.getElementById('dartboardHost'), token => addThrow(token));
}

function readStorage(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeStorage(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { document.getElementById('storageNotice').textContent = '端末に保存できません。今回の練習は続けられますが、終了後に成績が失われることがあります。'; return false; }
}
function readProgress(){
  const raw = readStorage(PROGRESS_KEY, {});
  const clean = {};
  for(const mode of Core.MODES){
    clean[mode] = {};
    for(const [score, item] of Object.entries(raw?.[mode] || {})){
      if(!item || !Number.isInteger(Number(score)) || Number(score) < 2 || Number(score) > 180) continue;
      if(!Number.isInteger(item.attempts) || !Number.isInteger(item.correct) || item.correct < 0 || item.attempts < item.correct) continue;
      clean[mode][score] = { attempts: item.attempts, correct: item.correct, review: item.review === true };
    }
  }
  return clean;
}
function recordResult(correct){
  const mode = currentMode();
  const before = progress[mode][startScore];
  resultReceipt = { mode, score: startScore, before: before ? {...before} : null };
  progress[mode][startScore] = { attempts: (before?.attempts || 0) + 1, correct: (before?.correct || 0) + Number(correct), review: !correct };
  writeStorage(PROGRESS_KEY, progress);
}
function retractResult(){
  if(!resultReceipt) return;
  const {mode, score, before} = resultReceipt;
  if(before) progress[mode][score] = before; else delete progress[mode][score];
  resultReceipt = null;
  writeStorage(PROGRESS_KEY, progress);
}
function updateStats(){
  const entries = Object.entries(progress[currentMode()]);
  const attempts = entries.reduce((sum,[,s])=>sum+s.attempts,0);
  const correct = entries.reduce((sum,[,s])=>sum+s.correct,0);
  document.getElementById('accuracy').textContent = attempts ? `${Math.round(correct / attempts * 100)}%` : '—';
  document.getElementById('statsCount').textContent = `${correct}正解 / ${attempts}回答`;
  const weak = entries.filter(([,s])=>s.review).map(([score])=>Number(score)).sort((a,b)=>a-b);
  updateMistakes(entries);
  document.getElementById('reviewScores').textContent = weak.length ? `復習待ち: ${weak.length}点数` : '復習待ちはありません';
}
function updateMistakes(entries){
  const failed = entries.filter(([,item])=>item.attempts>item.correct).sort((a,b)=>Number(a[0])-Number(b[0]));
  const total = Math.max(1,Math.ceil(failed.length/9));
  mistakesPage = Math.max(0,Math.min(total-1,mistakesPage));
  const area=document.getElementById('mistakeScores');area.textContent='';
  for(const [score,item] of failed.slice(mistakesPage*9,mistakesPage*9+9)){
    const button=document.createElement('button');button.className='btn btnSoft';
    button.textContent=`${score}点 (${item.attempts-item.correct}回)`;
    button.classList.toggle('reviewPending',item.review);
    button.title=item.review ? '復習待ち' : '復習済み';
    button.setAttribute('aria-label',`${score}点を再練習、間違い${item.attempts-item.correct}回`);
    button.onclick=()=>startTargetPractice(Number(score));area.appendChild(button);
  }
  if(!failed.length) area.textContent='まだ間違えた点数はありません。';
  document.getElementById('mistakesPosition').textContent=`${mistakesPage+1} / ${total}`;
  document.getElementById('previousMistakes').disabled=mistakesPage===0;
  document.getElementById('nextMistakes').disabled=mistakesPage===total-1;
}
function changeMistakes(delta){mistakesPage+=delta;updateStats();}
function saveSettings(){
  writeStorage(SETTINGS_KEY, { mode: currentMode(), min: Number(document.getElementById('rangeMin').value), max: Number(document.getElementById('rangeMax').value), review: document.getElementById('reviewPriority').checked, order: document.getElementById('questionOrder').value });
}
function restoreSettings(){
  const settings = readStorage(SETTINGS_KEY, {});
  if(Core.MODES.includes(settings.mode)) document.querySelector(`input[value="${settings.mode}"]`).checked = true;
  if(Core.candidates(settings.min, settings.max, currentMode()).length){
    document.getElementById('rangeMin').value = settings.min;
    document.getElementById('rangeMax').value = settings.max;
  }
  document.getElementById('reviewPriority').checked = settings.review !== false;
  document.getElementById('questionOrder').value = settings.order === 'sequential' ? 'sequential' : 'random';
  updateOrderControls();
}
function updateMissPlans(){
  const area = document.getElementById('missPlans');
  area.textContent = '';
  if(!answerShown){ area.textContent = '回答後に表示します。'; return; }
  const route = standardRoutes(startScore)[0];
  if(!route){ area.textContent = '3本以内の上がり目はありません。次のラウンドの上がり目を作りましょう。'; return; }
  const heading = document.createElement('p');
  heading.className = 'missHeading';
  heading.textContent = `最初の${route[0]}を外した例（残り2本）`;
  area.appendChild(heading);
  const grid = document.createElement('div');grid.className='missGrid';area.appendChild(grid);
  for(const plan of Core.missPlans(startScore, route, currentMode())){
    const item = document.createElement('div');item.className='missItem';
    const title = document.createElement('strong');
    title.textContent = `${plan.actual==='MISS' ? '得点なし' : plan.actual+'に入る'} → ${plan.done ? '' : '残り'+plan.remaining+'点'}`;
    const detail = document.createElement('p');
    detail.textContent = plan.done ? (plan.correct ? 'そのまま上がり' : plan.reason==='finish-rule' ? 'アウト条件違反。開始点数へ戻る。' : 'バースト。開始点数へ戻る。') : plan.route ? plan.route.join(' → ') : '残り2本では上がれません。';
    item.append(title,detail);
    if(plan.nextTurn){const next=document.createElement('p');next.className='nextTurn';next.textContent='次ラウンド: '+plan.nextTurn.join(' → ');item.appendChild(next);}
    grid.appendChild(item);
  }
}
document.querySelectorAll('input[name="mode"]').forEach(el=>{
  el.addEventListener('change', ()=>{
    // Keep confirmed results in the old mode; an unfinished question is not counted.
    const min = Number(document.getElementById('rangeMin').value);
    const max = Number(document.getElementById('rangeMax').value);
    if(!Core.candidates(min,max,currentMode()).length){
      document.getElementById('rangeMin').value = 2;
      document.getElementById('rangeMax').value = 170;
    }
    if(targetPractice){ startTargetPractice(startScore); } else newGame();
    updateSavedList();
  });
});
document.getElementById('rangePreset').addEventListener('change', e=>{
  if(!e.target.value) return;
  const [min,max] = e.target.value.split('-');
  document.getElementById('rangeMin').value = min;
  document.getElementById('rangeMax').value = max;
  newGame();
});
document.getElementById('reviewPriority').addEventListener('change', saveSettings);
function showScreen(name){
  if(name === 'practice' && resultReceipt) name = 'result';
  if(['result','explanation','miss'].includes(name) && !resultReceipt) name = 'practice';
  activeScreen = name;
  document.querySelectorAll('.appScreen').forEach(screen=>{ screen.hidden = screen.id !== name + 'Screen'; });
  document.querySelectorAll('[data-result-screen]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.resultScreen===name)));
  document.querySelectorAll('[data-screen]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.screen===name)));
}
function nextQuestion(){
  if(targetPractice) startTargetPractice(startScore); else newGame();
}
function applyPracticeSettings(){
  sequenceKey = ''; sequenceScore = null;
  newGame();
}
function updateOrderControls(){
  document.getElementById('reviewPriority').disabled = document.getElementById('questionOrder').value === 'sequential';
}
document.getElementById('quickMode').addEventListener('change',event=>{const radio=document.querySelector(`input[name="mode"][value="${event.target.value}"]`);radio.checked=true;radio.dispatchEvent(new Event('change'));});
document.getElementById('questionOrder').addEventListener('change',()=>{sequenceKey='';sequenceScore=null;updateOrderControls();saveSettings();});
async function boot(){
  restoreSettings(); buildButtons(); updateSavedList();
  await loadCheckoutData();
  newGame();
  if('serviceWorker' in navigator){
    try {
      const registration = await navigator.serviceWorker.register('./service-worker.js');
      let timer;
      try {
        await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('Offline cache activation timed out')), 15000);
        })]);
      } finally { clearTimeout(timer); }
      document.getElementById('offlineStatus').textContent = 'オフライン利用の準備ができました';
      if(registration.waiting) document.getElementById('offlineStatus').textContent = '更新があります。アプリをすべて閉じて開き直してください。';
      registration.addEventListener('updatefound', ()=>{
        registration.installing?.addEventListener('statechange', ()=>{
          if(registration.waiting) document.getElementById('offlineStatus').textContent = '更新があります。アプリをすべて閉じて開き直してください。';
        });
      });
    } catch(err) {
      document.getElementById('offlineStatus').textContent = 'オフライン準備に失敗しました。通信環境とHTTPS配信を確認してください。';
      console.warn('SW registration failed', err);
    }
  }else document.getElementById('offlineStatus').textContent = 'オフライン利用にはHTTPSで開いてください。';
}
boot();
