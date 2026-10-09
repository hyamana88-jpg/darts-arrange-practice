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

const EXPLANATIONS = {
  24:{
    title:"24 の考え方",
    text:"24 は D12 がそのまま見える基本残りです。偶数で、ダブルに直結するため迷いにくい点数です。",
    tips:["シンプルに D12 を狙いやすい残りです","偶数残しの基本として扱いやすい数字です"]
  },
  32:{
    title:"32 の考え方",
    text:"32 は D16 を続けて狙いやすく、最も安定しやすい残しの1つです。外して S16 に入っても再び 16 が残ります。",
    tips:["同じダブルを続けて狙える代表例です","外しても次が残りやすい残しです"]
  },
  40:{
    title:"40 の考え方",
    text:"40 は D20 をそのまま狙える最も基本的なフィニッシュです。アレンジの基準点としてよく使われます。",
    tips:["定番のダブルフィニッシュです","迷ったときの基準にしやすい数字です"]
  },
  50:{
    title:"50 の考え方",
    text:"ファットブル系では BULL でそのまま上がれる代表例です。ルールによって価値が大きく変わる点数です。",
    tips:["ファットブルでは BULL 1本で終了です","セパレートブル・ダブルアウトでは扱いが変わります"]
  },
  60:{
    title:"60 の考え方",
    text:"60 はルールで考え方が変わります。マスターなら T20、セパレートブル・ダブルアウトなら S20→D20 の形が代表例です。",
    tips:["1本で終わるか、ダブルに寄せるかをルールで切り替えます","ルール差を理解しやすい点数です"]
  },
  65:{
    title:"65 の考え方",
    text:"65 はブルを使う考え方が目立つ数字です。セパレートブル・ダブルアウトでは SB→D20、ファットブル系では BULL を絡める考え方があります。",
    tips:["ブル狙いが有効になりやすい代表例です","プレイヤーの得意不得意で選択が分かれます"]
  },
  70:{
    title:"70 の考え方",
    text:"70 台は 16 残しや 8 残しを意識して組み立てる考え方がよく使われます。代表的には T18→D8 です。",
    tips:["70 台は 16 残しの発想で覚えやすいです","外しても次を組み立てやすい形を意識します"]
  },
  72:{
    title:"72 の考え方",
    text:"72 は T16→D12 や T12→D18 が代表的です。16 系・12 系のどちらに寄せるかは好みや得意ダブルで変わります。",
    tips:["唯一の正解ではなく、代表候補が複数あります","得意ダブルに寄せる考え方がしやすい数字です"]
  },
  80:{
    title:"80 の考え方",
    text:"80 は T20→D10 が代表例です。20 始動で覚えやすく、標準候補として扱いやすい数字です。",
    tips:["20 のラインを使うため覚えやすいです","高いシングルを絡める考え方もあります"]
  },
  90:{
    title:"90 の考え方",
    text:"90 は T20→D15 が代表的です。90 台の覚え方の入口として使いやすく、20 始動の基本形として覚えられます。",
    tips:["20 始動の定番です","90 台の中では比較的覚えやすい点数です"]
  },
  91:{
    title:"91 の考え方",
    text:"91 は T17→D20 が代表例です。『51 → 40』の形で覚える説明もよく使われます。",
    tips:["91 → 51 → 40 の覚え方が有名です","最後を 40 に寄せる考え方の代表例です"]
  },
  100:{
    title:"100 の考え方",
    text:"100 は T20→D20 が基本候補です。高い残りでありながら、覚えやすく定番として扱いやすい数字です。",
    tips:["T20 始動の代表例です","標準候補として最初に覚えやすい 3 桁の残りです"]
  }
};

let checkoutData = [];
let checkoutByScore = new Map();

async function loadCheckoutData(){
  try{
    const res = await fetch("./data/darts_checkout_2_180_do_mo.json", {cache:"no-cache"});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    checkoutData = await res.json();
    checkoutByScore = new Map(checkoutData.map(x=>[Number(x.score), x]));
  }catch(err){
    console.warn("Checkout JSON could not be loaded; using built-in routes only.", err);
  }
}

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
function tokenValue(token){
  if(token === 'MISS') return 0;
  if(token === 'BULL') return 50;
  if(token === 'SB') return 25;
  const m = token[0];
  const n = Number(token.slice(1));
  if(m === 'S') return n;
  if(m === 'D') return n * 2;
  if(m === 'T') return n * 3;
  return 0;
}
function tokenClass(token){
  if(token === 'MISS') return 'M';
  if(token === 'BULL' || token === 'SB') return 'B';
  return token[0];
}
function finishAllowed(token){
  const mode = currentMode();
  if(mode === 'fat_single') return token !== 'MISS';
  if(mode === 'fat_master') return token.startsWith('D') || token.startsWith('T') || token === 'BULL';
  if(mode === 'sep_double') return token.startsWith('D');
  return false;
}
function standardRoutes(score){
  const mode = currentMode();
  if(mode === 'fat_single') return (STANDARD_ROUTES.fat_single && STANDARD_ROUTES.fat_single[score]) || [];

  const row = checkoutByScore.get(Number(score));
  if(row){
    const item = mode === 'sep_double' ? row.doubleOut : row.masterOutFatBull;
    if(item && Array.isArray(item.route) && item.route.length){
      // Normalize source tokens to app tokens. In MO data, B means fat bull (=50).
      const normalized = item.route.map(t => t === 'B' ? 'BULL' : t);
      // Ignore malformed source tokens rather than teaching an invalid route.
      if(normalized.every(isValidToken)) return [normalized];
    }
  }
  return (STANDARD_ROUTES[mode] && STANDARD_ROUTES[mode][score]) || [];
}

function isValidToken(token){
  if(token === 'BULL' || token === 'SB' || token === 'MISS') return true;
  return /^(S|D|T)([1-9]|1[0-9]|20)$/.test(token);
}
function getCustomStore(){
  try{
    return JSON.parse(localStorage.getItem('darts_custom_routes_v6') || '{}');
  }catch(e){
    return {};
  }
}
function setCustomStore(data){
  localStorage.setItem('darts_custom_routes_v6', JSON.stringify(data));
}
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
function allKnownRoutes(score){
  return [...standardRoutes(score), ...customRoutes(score)];
}
function genericExplanation(score){
  if(score <= 40){
    return {
      title: `${score} の考え方`,
      text: '40 以下は、早くダブルを狙えるか、外しても次が残るかが重要です。40・32・24 のような基本ダブルを意識する考え方がよく使われます。',
      tips:['低い残りでは安定したダブル残しを優先します','バーストを避ける意識が大切です']
    };
  }
  if(score <= 60){
    return {
      title:`${score} の考え方`,
      text:'41〜60 はシングルを外したときの保険や、次にダブルへつなげやすい残し方が重要です。無理に派手なルートより、次につながる形を優先します。',
      tips:['外しても次が残るルートを意識します','自分の得意ナンバーに寄せる考え方も有効です']
    };
  }
  if(score <= 80){
    return {
      title:`${score} の考え方`,
      text:'60〜80 台は、16 残し・12 残しなど、終盤のダブルに寄せる発想が使いやすいゾーンです。20 始動か、狙いやすいトリプル始動かを選びます。',
      tips:['70 台は 16 残しの発想で覚えやすいです','唯一の正解ではなく、代表候補が複数あることもあります']
    };
  }
  if(score <= 100){
    return {
      title:`${score} の考え方`,
      text:'80〜100 はトリプル始動の定番アレンジが多いゾーンです。高い残りでも、最後に良いダブルを残せるかを基準に考えます。',
      tips:['20 始動の定番候補が多い範囲です','覚え方でまとめると整理しやすいゾーンです']
    };
  }
  return {
    title:`${score} の考え方`,
    text:'100 を超える残りでは、上がりきることだけでなく、次ターンに良い形を残せるかも重要です。無理せず、次につながる組み立てを考えます。',
    tips:['一度で上がれなくても、次の上がり目を作る発想が大切です','プレイヤーの得意ナンバーで選択が分かれます']
  };
}
function updateExplanation(){
  const data = EXPLANATIONS[startScore] || genericExplanation(startScore);
  document.getElementById('explainTitle').textContent = data.title + ' / ' + currentModeLabel();
  document.getElementById('explainText').textContent = data.text;
  document.getElementById('tipList').innerHTML = (data.tips || []).map(t=>`<li>${t}</li>`).join('');
}
function updateRoutes(){
  const standard = standardRoutes(startScore);
  const custom = customRoutes(startScore);
  const area = document.getElementById('routeArea');
  let html = '';
  if(standard.length){
    html += `<div class="routeGroup"><div class="routeGroupTitle">標準候補</div>`;
    html += standard.map(r=>`<div class="routeItem">${r.join(' → ')}</div>`).join('');
    html += `</div>`;
  }else{
    html += `<div class="routeGroup"><div class="routeGroupTitle">標準候補</div><div class="routeItem">候補未登録</div></div>`;
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
  const badge = document.getElementById('statusBadge');
  badge.className = 'badge ' + type;
  badge.textContent = text;

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
}
function updateAll(){
  updateModeChips();
  updateScores();
  updateThrows();
  updateRoutes();
  updateExplanation();
}
function newGame(){
  const mode = currentMode();
  if(mode === 'fat_single'){
    const candidates = Object.keys(STANDARD_ROUTES.fat_single).map(Number);
    startScore = candidates[Math.floor(Math.random()*candidates.length)];
  }else{
    const candidates = checkoutData
      .filter(x=>{ const r = mode === 'sep_double' ? x.doubleOut?.route : x.masterOutFatBull?.route; return Array.isArray(r) && r.length; })
      .map(x=>Number(x.score));
    startScore = candidates.length ? candidates[Math.floor(Math.random()*candidates.length)] : (Math.floor(Math.random()*81)+40);
  }
  currentScore = startScore;
  throws = [];
  history = [];
  setStatus('info','入力途中','3本以内でちょうど 0 にし、最後の1本が現在のアウト条件を満たすと成功です。');
  updateAll(); showStandardAnswer();
}
function clearThrows(){
  currentScore = startScore;
  throws = [];
  history = [];
  setStatus('info','入力途中','入力をリセットしました。');
  updateAll(); showStandardAnswer();
}
function undoThrow(){
  if(!history.length) return;
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
function finalizeByThreeDarts(){
  if(currentScore === 0) return;
  setStatus('warn','3投で未クリア','3本終了時点で残り ' + currentScore + ' 点です。');
}

function showStandardAnswer(){
  const routes = standardRoutes(startScore);
  const el = document.getElementById('standardAnswer');
  if(!routes.length){
    el.innerHTML="標準候補未登録";
    return;
  }
  el.innerHTML = routes.map(r=>"<div>"+r.join(" → ")+"</div>").join("");
}

function addThrow(token){
  if(throws.length >= 3) return;

  history.push({prevScore: currentScore});
  throws.push(token);
  currentScore -= tokenValue(token);

  if(currentScore < 0){
    setStatus('bad','バースト','0 を下回ったため失敗です。');
  }else if(currentScore === 0){
    if(!finishAllowed(token)){
      setStatus('bad','アウト条件違反','0 にはなりましたが、最後の1本が現在のアウト条件を満たしていません。');
    }else{
      const exactStandard = standardRoutes(startScore).some(r=>routeEquals(r, throws));
      if(exactStandard){
        setStatus('ok','標準正解','標準候補に一致しています。');
      }else{
        setStatus('info','ルール上は正解','0 ちょうどでアウト条件も満たしています。');
      }
    }
  }else{
    if(throws.length >= 3){
      finalizeByThreeDarts();
    }else{
      setStatus('info','入力途中','残り ' + currentScore + ' 点です。');
    }
  }
  updateAll(); showStandardAnswer();
}
function saveCustomRoute(){
  const score = Number(document.getElementById('customScore').value);
  const raw = document.getElementById('customRoute').value.trim();
  if(!score || !raw){
    alert('点数とルートを入力してください。');
    return;
  }
  const tokens = raw.split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
  const store = getCustomStore();
  const mode = currentMode();
  if(!store[mode]) store[mode] = {};
  if(!store[mode][String(score)]) store[mode][String(score)] = [];
  store[mode][String(score)].push(tokens);
  setCustomStore(store);
  document.getElementById('customScore').value = '';
  document.getElementById('customRoute').value = '';
  updateSavedList();
  updateRoutes();
}
function updateSavedList(){
  const store = getCustomStore();
  const mode = currentMode();
  const data = store[mode] || {};
  const entries = Object.entries(data).sort((a,b)=>Number(b[0]) - Number(a[0]));
  const area = document.getElementById('savedList');
  if(!entries.length){
    area.innerHTML = '<div class="savedItem"><div><div class="savedScore">登録なし</div><div>このルールの自分登録はまだありません</div></div></div>';
    return;
  }
  area.innerHTML = entries.map(([score, routes])=>{
    return `<div class="savedItem">
      <div>
        <div class="savedScore">${score} 点 / ${currentModeLabel()}</div>
        <div class="mono">${routes.map(r=>r.join(' → ')).join('<br>')}</div>
      </div>
    </div>`;
  }).join('');
}
function buildButtons(){
  const singleGrid = document.getElementById('singleGrid');
  const doubleGrid = document.getElementById('doubleGrid');
  const tripleGrid = document.getElementById('tripleGrid');
  const bullGrid = document.getElementById('bullGrid');

  for(let i=1;i<=20;i++){
    const s = document.createElement('button');
    s.className = 'dartBtn single';
    s.textContent = 'S' + i;
    s.onclick = ()=>addThrow('S'+i);
    singleGrid.appendChild(s);

    const d = document.createElement('button');
    d.className = 'dartBtn double';
    d.textContent = 'D' + i;
    d.onclick = ()=>addThrow('D'+i);
    doubleGrid.appendChild(d);

    const t = document.createElement('button');
    t.className = 'dartBtn triple';
    t.textContent = 'T' + i;
    t.onclick = ()=>addThrow('T'+i);
    tripleGrid.appendChild(t);
  }

  [
    {label:'BULL', cls:'bull', token:'BULL'},
    {label:'SB', cls:'bull', token:'SB'},
    {label:'MISS', cls:'miss', token:'MISS'}
  ].forEach(item=>{
    const b = document.createElement('button');
    b.className = 'dartBtn ' + item.cls;
    b.textContent = item.label;
    b.onclick = ()=>addThrow(item.token);
    bullGrid.appendChild(b);
  });
}
document.querySelectorAll('input[name="mode"]').forEach(el=>{
  el.addEventListener('change', ()=>{
    updateModeChips();
    clearThrows();
    updateRoutes();
    updateExplanation();
    updateSavedList();
  });
});

async function boot(){
  buildButtons();
  updateSavedList();
  await loadCheckoutData();
  newGame();
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('SW registration failed', err));
  }
}
boot();
