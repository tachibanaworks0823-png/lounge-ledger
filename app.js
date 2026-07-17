window.SUPABASE_URL ??= 'https://ojrdymzceyfqjjnhleqh.supabase.co';
window.SUPABASE_PUBLISHABLE_KEY ??= 'sb_publishable_dppPYAR_cf23aziHH4g_tA_eMvEGdf4';

const storageKey = 'lounge-ledger-v1';
const supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
let cloudUser = null, saveTimer = null;
const defaultData = {
  month: '2026-07',
  casts: [
    { id:'momo', name:'もも', hourly:2000 }, { id:'rina', name:'りな', hourly:2300 }, { id:'yui', name:'ゆい', hourly:1800 }
  ],
  slips: [
    { id:'S-0703-01', date:'2026-07-03', total:49300, card:36100, groups:3, guests:3, casts:[{castId:'momo',type:'本指名',sales:222000,drink:2,bottle:0}] },
    { id:'S-0704-01', date:'2026-07-04', total:115800, card:0, groups:2, guests:4, casts:[{castId:'momo',type:'本指名',sales:0,drink:1,bottle:1},{castId:'rina',type:'フリー・場内',sales:0,drink:2,bottle:0}] },
    { id:'S-0710-01', date:'2026-07-10', total:150800, card:47600, groups:6, guests:10, casts:[{castId:'rina',type:'同伴',sales:65000,drink:3,bottle:1}] }
  ],
  shifts: [
    { date:'2026-07-03',castId:'momo',hours:7.5,advance:5000 },{ date:'2026-07-04',castId:'momo',hours:7,advance:10000 },{ date:'2026-07-04',castId:'rina',hours:6,advance:5000 },{ date:'2026-07-10',castId:'rina',hours:7.5,advance:10000 },{ date:'2026-07-10',castId:'yui',hours:6,advance:5000 }
  ],
  expenses: [
    {id:'E-1',date:'2026-07-03',category:'酒代',company:'○○酒販',note:'営業用酒類',amount:984},{id:'E-2',date:'2026-07-04',category:'食材',company:'スーパー',note:'フルーツ・軽食',amount:1329},{id:'E-3',date:'2026-07-10',category:'備品',company:'通販',note:'紙おしぼり',amount:2400}
  ],
  settings:{ mainNomination:2500, companion:5000, extension:1500, drink:500, bottle:3000, champagne:7000, taxRate:10, welfareRate:5, categories:['酒代','食材','備品','カラオケ','印刷','通信費','組合費','交通費','家賃','ガス','その他'] }
};
function normalizeData(source){
  const value=source||{};
  return {...defaultData,...value,month:value.month||defaultData.month,casts:Array.isArray(value.casts)?value.casts:[],slips:Array.isArray(value.slips)?value.slips:[],shifts:Array.isArray(value.shifts)?value.shifts:[],expenses:Array.isArray(value.expenses)?value.expenses:[],settings:{...defaultData.settings,...(value.settings||{}),categories:Array.isArray(value.settings?.categories)?value.settings.categories:defaultData.settings.categories}};
}
let data = normalizeData(JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultData);
const $ = s => document.querySelector(s); const yen = n => '¥' + new Intl.NumberFormat('ja-JP').format(Math.round(n||0));
const save = () => { localStorage.setItem(storageKey, JSON.stringify(data)); if(cloudUser){ clearTimeout(saveTimer); saveTimer=setTimeout(saveToCloud,500); } };
async function saveToCloud(){ const {error}=await supabaseClient.from('store_data').upsert({user_id:cloudUser.id,payload:data,updated_at:new Date().toISOString()}); if(error) console.error('Cloud save failed',error); }
async function loadFromCloud(){ const {data:row,error}=await supabaseClient.from('store_data').select('payload').eq('user_id',cloudUser.id).maybeSingle(); if(error){showAuthMessage('データベース設定を確認してください。');return;} if(row?.payload){data=normalizeData(row.payload);localStorage.setItem(storageKey,JSON.stringify(data));} render(); }
const castName = id => data.casts.find(x=>x.id===id)?.name || '退職キャスト';
const dateJP = d => new Date(d+'T12:00:00').toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
function calcCast(cast){
  const slips=data.slips.flatMap(s=>s.casts.map(a=>({...a,date:s.date}))).filter(a=>a.castId===cast.id);
  const shifts=data.shifts.filter(x=>x.castId===cast.id); const hours=shifts.reduce((n,x)=>n+Number(x.hours),0); const advance=shifts.reduce((n,x)=>n+Number(x.advance),0);
  const nominated=slips.filter(x=>x.type==='本指名').reduce((n,x)=>n+Number(x.sales),0); const main=slips.filter(x=>x.type==='本指名').length; const companion=slips.filter(x=>x.type==='同伴').length;
  const drink=slips.reduce((n,x)=>n+Number(x.drink),0), bottle=slips.reduce((n,x)=>n+Number(x.bottle),0), champagne=slips.reduce((n,x)=>n+Number(x.champagne),0), extension=slips.reduce((n,x)=>n+Number(x.extension),0);
  const back=main*data.settings.mainNomination + companion*data.settings.companion + extension*data.settings.extension + drink*data.settings.drink + bottle*data.settings.bottle + champagne*data.settings.champagne;
  const hourly=hours*cast.hourly, gross=hourly+back; const deductions=Math.round(gross*(Number(data.settings.taxRate)+Number(data.settings.welfareRate))/100);
  return {hours,advance,nominated,main,companion,drink,bottle,back,hourly,gross,deductions,payout:Math.max(0,gross-deductions-advance)};
}
function totals(){const sales=data.slips.reduce((n,x)=>n+Number(x.total),0);const expense=data.expenses.reduce((n,x)=>n+Number(x.amount),0);const payroll=data.casts.reduce((n,c)=>n+calcCast(c).payout,0);return {sales,expense,payroll,balance:sales-expense-payroll};}
function render(){ renderDashboard();renderSlips();renderCasts();renderExpenses();renderSettings(); }
function dailyRows(){
  const [year,month]=data.month.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  const weekdays=['日','月','火','水','木','金','土'];
  return Array.from({length:count},(_,i)=>{
    const date=data.month+'-'+String(i+1).padStart(2,'0');
    const slips=data.slips.filter(x=>x.date===date), expenses=data.expenses.filter(x=>x.date===date), shifts=data.shifts.filter(x=>x.date===date);
    const sales=slips.reduce((n,x)=>n+Number(x.total||0),0);
    const card=slips.reduce((n,x)=>n+Number(x.card||0),0);
    const groups=slips.reduce((n,x)=>n+Number(x.groups||0),0);
    const guests=slips.reduce((n,x)=>n+Number(x.guests||0),0);
    const nominated=slips.reduce((n,x)=>n+x.casts.reduce((m,c)=>m+Number(c.sales||0),0),0);
    const expense=expenses.reduce((n,x)=>n+Number(x.amount||0),0);
    const advance=shifts.reduce((n,x)=>n+Number(x.advance||0),0);
    const hourly=shifts.reduce((n,x)=>n+Number(x.hours||0)*(data.casts.find(c=>c.id===x.castId)?.hourly||0),0);
    const back=slips.reduce((n,slip)=>n+slip.casts.reduce((m,item)=>m+(item.type==='本指名'?Number(data.settings.mainNomination||0):0)+(item.type==='同伴'?Number(data.settings.companion||0):0)+Number(item.extension||0)*Number(data.settings.extension||0)+Number(item.drink||0)*Number(data.settings.drink||0)+Number(item.bottle||0)*Number(data.settings.bottle||0)+Number(item.champagne||0)*Number(data.settings.champagne||0),0),0);
    const gross=hourly+back;
    const deductions=Math.round(gross*(Number(data.settings.taxRate||0)+Number(data.settings.welfareRate||0))/100);
    const payroll=Math.max(0,gross-deductions-advance);
    const cash=Math.max(0,sales-card);
    return {date,day:i+1,weekday:weekdays[new Date(date+'T12:00:00').getDay()],sales,card,cash,groups,guests,nominated,expense,advance,payroll,cashBalance:cash-expense-advance};
  });
}
function renderDashboard(){
  const t=totals(); $('#totalSales').textContent=yen(t.sales);$('#salesCount').textContent=`伝票 ${data.slips.length}件`;$('#totalPayroll').textContent=yen(t.payroll);$('#payrollRatio').textContent=`${t.sales?Math.round(t.payroll/t.sales*100):0}%`;$('#totalExpenses').textContent=yen(t.expense);$('#expenseDetails').textContent=`経費 ${data.expenses.length}件`;$('#payrollDetails').textContent=`売上に対して ${t.sales?Math.round(t.payroll/t.sales*100):0}%`;
  const rows=dailyRows(), activeRows=rows.filter(x=>x.sales||x.expense);
  $('#dailyLedgerTotal').textContent=yen(t.sales);
  const guests=rows.reduce((n,x)=>n+x.guests,0), groups=rows.reduce((n,x)=>n+x.groups,0), activeDays=activeRows.length;
  $('#dailyKpis').innerHTML=[
    ['営業日数',`${activeDays}日`,'売上または支出の登録日'],
    ['平均日商',yen(activeDays?t.sales/activeDays:0),'営業日の平均'],
    ['平均客単価',yen(guests?t.sales/guests:0),`来店 ${guests}名 / ${groups}組`],
    ['現金比率',`${t.sales?Math.round(rows.reduce((n,x)=>n+x.cash,0)/t.sales*100):0}%`,'現金売上 ÷ 総売上']
  ].map(([label,value,note])=>`<div class="daily-kpi"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  $('#dailySalesTable').innerHTML=rows.map(x=>{
    const hasActivity=x.sales||x.expense||x.advance||x.payroll;
    const amount=n=>n?yen(n):'—';
    return '<tr class="'+(hasActivity?'has-activity':'')+'"><td><b>'+x.day+'日</b></td><td class="weekday">('+x.weekday+')</td><td class="amount sales">'+amount(x.sales)+'</td><td class="amount">'+amount(x.cash)+'</td><td class="amount">'+amount(x.card)+'</td><td class="amount">'+amount(x.advance)+'</td><td>'+ (x.groups||'—')+'</td><td>'+ (x.guests||'—')+'</td><td class="amount">'+(x.guests?yen(x.sales/x.guests):'—')+'</td><td class="amount expense">'+amount(x.expense)+'</td><td class="amount balance">'+(hasActivity?yen(x.cashBalance):'—')+'</td><td class="amount">'+amount(x.payroll)+'</td><td>'+ (x.sales?Math.round(x.payroll/x.sales*100)+'%':'—')+'</td></tr>';
  }).join('');
}
function renderSlips(){
  $('#slipSummary').textContent=data.month.replace('-','年')+'月・'+data.slips.length+'件';
  $('#slipTable').innerHTML=data.slips.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(s=>{
    const payment=s.payment||(s.card?'カード':'現金');
    const nomination=s.nominationType||(s.casts?.map(a=>a.type).filter(Boolean).join('、')||'—');
    return '<tr><td>'+dateJP(s.date)+'</td><td>'+ (s.customerName||'—')+'</td><td>'+s.id+'</td><td>'+yen(s.total)+'</td><td><span class="status '+(payment==='カード'?'':'cash')+'">'+payment+'</span></td><td>'+s.guests+'名</td><td>'+nomination+'</td><td><button class="text-button" onclick="removeItem(\'slips\',\''+s.id+'\')">削除</button></td></tr>';
  }).join('')||empty(8,'伝票はまだありません');
}
function renderCasts(){ $('#castTable').innerHTML=data.casts.map(c=>{const x=calcCast(c);return `<tr><td><b>${c.name}</b><br><small>時給 ${yen(c.hourly)}</small></td><td>${yen(x.nominated)}</td><td>${x.main}本 / ${x.companion}本</td><td>${x.hours.toFixed(1)}h</td><td>${yen(x.hourly)}</td><td>${yen(x.back)}</td><td>${yen(x.deductions+x.advance)}</td><td><b>${yen(x.payout)}</b></td><td><button class="text-button" onclick="removeCast('${c.id}')">削除</button></td></tr>`}).join('')||empty(9,'キャストはまだいません'); }
function renderExpenses(){const m={};data.expenses.forEach(x=>m[x.category]=(m[x.category]||0)+Number(x.amount));$('#expenseSummary').innerHTML=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>`<div class="category-card"><p>${x[0]}</p><strong>${yen(x[1])}</strong></div>`).join('')||'<div class="category-card"><p>支出を入力するとカテゴリ別に集計されます</p><strong>¥0</strong></div>';
$('#expenseTable').innerHTML=data.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${dateJP(x.date)}</td><td><span class="status">${x.category}</span></td><td>${x.company}</td><td>${x.note||'—'}</td><td>${yen(x.amount)}</td><td><button class="text-button" onclick="removeItem('expenses','${x.id}')">削除</button></td></tr>`).join('')||empty(6,'支出はまだありません');}
function renderSettings(){ const labels={mainNomination:'本指名バック（1本）',companion:'同伴バック（1本）',extension:'延長バック（1本）',drink:'ドリンクバック（1杯）',bottle:'ボトルバック（1本）',champagne:'シャンパンバック（1本）'};$('#backSettings').innerHTML=Object.entries(labels).map(([k,l])=>`<label class="setting-field">${l}<input data-setting="${k}" type="number" min="0" value="${data.settings[k]}"></label>`).join('');$('#deductionSettings').innerHTML=`<label class="setting-field">所得税（%）<input data-setting="taxRate" type="number" min="0" value="${data.settings.taxRate}"></label><label class="setting-field">厚生費（%）<input data-setting="welfareRate" type="number" min="0" value="${data.settings.welfareRate}"></label><label class="setting-field full">支出カテゴリ（カンマ区切り）<input id="categories" value="${data.settings.categories.join(',')}"></label>`;$('#castRateSettings').innerHTML=data.casts.map(c=>`<label class="cast-rate"><span>${c.name}<small> 基本時給</small></span><input data-hourly="${c.id}" type="number" min="0" value="${c.hourly}">円</label>`).join(''); }
const empty=(n,text)=>`<tr><td colspan="${n}" class="empty">${text}</td></tr>`;
function setView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));const h=document.querySelector(`#${id} h2`);$('#pageTitle').textContent=id==='dashboard'?'7月の営業状況':h.textContent;closeMenu();window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-view-target]').forEach(b=>b.onclick=()=>setView(b.dataset.viewTarget));
const dialog=$('#entryDialog'), form=$('#entryForm'), fields=$('#formFields');let mode='';
const field=(label,name,type='text',cls='')=>`<label class="field ${cls}">${label}<input required name="${name}" type="${type}"></label>`;
function businessDate(){
  const d=new Date();
  if(d.getHours()<6)d.setDate(d.getDate()-1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function customerOptions(){
  return [...new Set(data.slips.map(x=>x.customerName).filter(Boolean))].map(name=>'<option value="'+String(name).replace(/"/g,'&quot;')+'"></option>').join('');
}
function openForm(type){mode=type;$('#dialogKicker').textContent=type==='slip'?'SALES SLIP':type==='expense'?'EXPENSE':type==='shift'?'SHIFT':'CAST';
 if(type==='slip'){
   $('#dialogTitle').textContent='伝票を入力';
   fields.innerHTML=field('日付','date','date')+
   '<label class="field full">顧客名<input required name="customerName" list="customerHistory" autocomplete="off"></label><datalist id="customerHistory">'+customerOptions()+'</datalist>'+
   field('伝票番号','id','text')+field('売上','total','number')+
   '<label class="field">決済<select required name="payment"><option value="" selected disabled>選択してください</option><option value="現金">現金</option><option value="カード">カード</option></select></label>'+
   field('客数','guests','number')+
   '<label class="field"><span>指名</span><select required name="nominationType"><option value="" selected disabled>選択してください</option><option value="本指名">本指名</option><option value="同伴">同伴</option><option value="場内">場内</option></select></label>';
 }
 if(type==='expense'){ $('#dialogTitle').textContent='支出を入力';fields.innerHTML=field('支出日','date','date')+'<label class="field">カテゴリ<select name="category">'+data.settings.categories.map(x=>'<option>'+x+'</option>').join('')+'</select></label>'+field('会社名・支払先','company')+field('金額','amount','number')+field('内容（任意）','note','text','full');}
 if(type==='shift'){ $('#dialogTitle').textContent='勤務を登録';fields.innerHTML=field('勤務日','date','date')+'<label class="field">キャスト<select name="castId">'+data.casts.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label>'+field('実働時間','hours','number')+field('日払い','advance','number');}
 if(type==='cast'){ $('#dialogTitle').textContent='キャストを追加';fields.innerHTML=field('お名前','name')+field('基本時給','hourly','number');}
 const now=new Date().toISOString().slice(0,10);fields.querySelectorAll('input[type=date]').forEach(x=>x.value=now);if(type==='slip')fields.elements.date.value=businessDate();dialog.showModal();
}
['addSlip','dashboardAddSlip'].forEach(id=>$('#'+id).onclick=()=>openForm('slip'));$('#addExpense').onclick=()=>openForm('expense');$('#addShift').onclick=()=>openForm('shift');$('#addCast').onclick=()=>openForm('cast');
form.addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const x=Object.fromEntries(new FormData(form));if(mode==='slip'){data.slips.push({id:x.id,date:x.date,customerName:x.customerName,total:+x.total,card:x.payment==='カード'?+x.total:0,payment:x.payment,groups:1,guests:+x.guests,nominationType:x.nominationType,casts:[]})}if(mode==='expense'){data.expenses.push({id:'E-'+Date.now(),date:x.date,category:x.category,company:x.company,note:x.note,amount:+x.amount})}if(mode==='shift'){data.shifts.push({date:x.date,castId:x.castId,hours:+x.hours,advance:+x.advance})}if(mode==='cast'){data.casts.push({id:'c-'+Date.now(),name:x.name,hourly:+x.hourly})}save();render();dialog.close();});
window.removeItem=(type,id)=>{if(!confirm('このデータを削除しますか？'))return;data[type]=data[type].filter(x=>x.id!==id);save();render()};window.removeCast=id=>{if(!confirm('キャストを削除しますか？ 関連する過去データは残ります。'))return;data.casts=data.casts.filter(x=>x.id!==id);save();render()};
$('#saveSettings').onclick=()=>{document.querySelectorAll('[data-setting]').forEach(x=>data.settings[x.dataset.setting]=Number(x.value));data.settings.categories=$('#categories').value.split(',').map(x=>x.trim()).filter(Boolean);document.querySelectorAll('[data-hourly]').forEach(x=>{const c=data.casts.find(c=>c.id===x.dataset.hourly);if(c)c.hourly=Number(x.value)});save();render();alert('計算設定を保存しました。')};
$('#menuButton').onclick=()=>{$('#sidebar').classList.add('open');$('#overlay').classList.add('show')};function closeMenu(){$('#sidebar').classList.remove('open');$('#overlay').classList.remove('show')}$('#overlay').onclick=closeMenu;
const now=new Date();$('#todayLabel').textContent=now.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
function showAuthMessage(message){$('#authMessage').textContent=message;}
async function initializeAuth(){
  if(!supabaseClient){showAuthMessage('認証サービスを読み込めませんでした。');return;}
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(session) await setSignedIn(session.user);
  supabaseClient.auth.onAuthStateChange(async(_event,session)=>{if(session&&!cloudUser) await setSignedIn(session.user);if(!session){cloudUser=null;$('#authScreen').classList.remove('hidden');}});
}
async function setSignedIn(user){cloudUser=user;$('#authScreen').classList.add('hidden');await loadFromCloud();}
$('#authForm').addEventListener('submit',async e=>{e.preventDefault();showAuthMessage('ログインしています…');const {error}=await supabaseClient.auth.signInWithPassword({email:$('#authEmail').value,password:$('#authPassword').value});if(error)showAuthMessage('ログインできませんでした。メールアドレスとパスワードを確認してください。');});
$('#signUpButton').onclick=async()=>{const email=$('#authEmail').value,password=$('#authPassword').value;if(!email||!password){showAuthMessage('メールアドレスと6文字以上のパスワードを入力してください。');return;}showAuthMessage('アカウントを作成しています…');const {data:result,error}=await supabaseClient.auth.signUp({email,password});if(error)showAuthMessage(error.message);else if(!result.session)showAuthMessage('確認メールを送信しました。メール内のリンクを開いてください。');};
$('#logoutButton').onclick=()=>supabaseClient.auth.signOut();
initializeAuth();
