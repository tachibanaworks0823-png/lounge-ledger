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
  dailyInputs: [],
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
  return {...defaultData,...value,month:value.month||defaultData.month,casts:Array.isArray(value.casts)?value.casts:[],slips:Array.isArray(value.slips)?value.slips:[],dailyInputs:Array.isArray(value.dailyInputs)?value.dailyInputs:[],shifts:Array.isArray(value.shifts)?value.shifts:[],expenses:Array.isArray(value.expenses)?value.expenses:[],settings:{...defaultData.settings,...(value.settings||{}),categories:Array.isArray(value.settings?.categories)?value.settings.categories:defaultData.settings.categories,payeeHistory:Array.isArray(value.settings?.payeeHistory)?value.settings.payeeHistory:[...new Set((Array.isArray(value.expenses)?value.expenses:[]).map(x=>x.company).filter(Boolean))]}};
}
let data = normalizeData(JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultData);
const $ = s => document.querySelector(s); const yen = n => '¥' + new Intl.NumberFormat('ja-JP').format(Math.round(n||0));
const save = () => { localStorage.setItem(storageKey, JSON.stringify(data)); if(cloudUser){ clearTimeout(saveTimer); saveTimer=setTimeout(saveToCloud,500); } };
async function saveToCloud(){ const {error}=await supabaseClient.from('store_data').upsert({user_id:cloudUser.id,payload:data,updated_at:new Date().toISOString()}); if(error) console.error('Cloud save failed',error); }
async function loadFromCloud(){ const {data:row,error}=await supabaseClient.from('store_data').select('payload').eq('user_id',cloudUser.id).maybeSingle(); if(error){showAuthMessage('データベース設定を確認してください。');return;} if(row?.payload){data=normalizeData(row.payload);localStorage.setItem(storageKey,JSON.stringify(data));} render(); }
const castName = id => data.casts.find(x=>x.id===id)?.name || '退職キャスト';
const sortedCasts = () => data.casts.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja'));
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
function render(){ renderDashboard();renderSlips();renderDailyInputs();renderCasts();renderCastManagement();renderShifts();renderExpenses();renderSettings(); }
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
    ['平均客単価',yen(guests?t.sales/guests:0),`来店 ${groups}組 / ${guests}名`],
    ['現金比率',`${t.sales?Math.round(rows.reduce((n,x)=>n+x.cash,0)/t.sales*100):0}%`,'現金売上 ÷ 総売上']
  ].map(([label,value,note])=>`<div class="daily-kpi"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  $('#dailySalesTable').innerHTML=rows.map(x=>{
    const hasActivity=x.sales||x.expense||x.advance||x.payroll;
    const amount=n=>n?yen(n):'—';
    return '<tr class="'+(hasActivity?'has-activity':'')+'"><td><b>'+x.day+'日</b></td><td class="weekday">('+x.weekday+')</td><td class="amount sales">'+amount(x.sales)+'</td><td class="amount">'+amount(x.cash)+'</td><td class="amount">'+amount(x.card)+'</td><td>'+ (x.groups||'—')+'</td><td>'+ (x.guests||'—')+'</td><td class="amount">'+(x.guests?yen(x.sales/x.guests):'—')+'</td><td class="amount">'+amount(x.advance)+'</td><td class="amount expense">'+amount(x.expense)+'</td><td class="amount balance">'+(hasActivity?yen(x.cashBalance):'—')+'</td><td class="amount">'+amount(x.payroll)+'</td><td>'+ (x.sales?Math.round(x.payroll/x.sales*100)+'%':'—')+'</td></tr>';
  }).join('');
}
function renderSlips(){
  const direction=slipDateSort==='asc'?1:-1;
  $('#sortSlipsDate').textContent='日付 '+(slipDateSort==='asc'?'↑':'↓');
  $('#slipSummary').textContent=data.month.replace('-','年')+'月・'+data.slips.length+'件';
  $('#slipTable').innerHTML=data.slips.slice().sort((a,b)=>a.date.localeCompare(b.date)*direction).map(s=>{
    const payment=s.payment||(s.card?'カード':'現金');
    return '<tr><td>'+dateJP(s.date)+'</td><td>'+ (s.customerName||'—')+'</td><td>'+s.id+'</td><td>'+yen(s.total)+'</td><td><span class="status '+(payment==='カード'?'':'cash')+'">'+payment+'</span></td><td>'+s.guests+'名</td><td><button class="text-button" onclick="removeItem(\'slips\',\''+s.id+'\')">削除</button></td></tr>';
  }).join('')||empty(7,'伝票はまだありません');
}
function renderDailyInputs(){const rows=data.dailyInputs.slice().sort((a,b)=>b.date.localeCompare(a.date));$('#dailyInputSummary').textContent=data.month.replace('-','年')+'月・'+rows.length+'件';$('#dailyInputTable').innerHTML=rows.map(x=>'<tr><td>'+dateJP(x.date)+'</td><td><b>'+castName(x.castId)+'</b></td><td>'+(x.startTime||'—')+'</td><td>'+(x.endTime||'—')+'</td><td>'+(x.hours?x.hours+'h':'—')+'</td><td>'+yen(x.advance)+'</td><td>'+yen(x.deduction)+'</td><td>'+Number(x.areaNomination||0)+'本</td><td>'+Number(x.mainCount||0)+'本</td><td>'+Number(x.companionCount||0)+'本</td><td>'+yen(x.mainSales)+'</td><td><button class="text-button" onclick="editDailyInput(\''+x.id+'\')">編集</button><button class="text-button" onclick="removeItem(\'dailyInputs\',\''+x.id+'\')">削除</button></td></tr>').join('')||empty(12,'日別打込みはまだありません');}
function renderCasts(){ $('#castTable').innerHTML=sortedCasts().map(c=>{const x=calcCast(c);return `<tr><td><b>${c.name}</b><br><small>時給 ${yen(c.hourly)}</small></td><td>${yen(x.nominated)}</td><td>${x.main}本 / ${x.companion}本</td><td>${x.hours.toFixed(1)}h</td><td>${yen(x.hourly)}</td><td>${yen(x.back)}</td><td>${yen(x.deductions+x.advance)}</td><td><b>${yen(x.payout)}</b></td><td><button class="text-button" onclick="removeCast('${c.id}')">削除</button></td></tr>`}).join('')||empty(9,'キャストはまだいません'); }
function renderCastManagement(){
  $('#castManagementTable').innerHTML=sortedCasts().map(c=>'<tr><td><b>'+c.name+'</b></td><td><span class="status">'+(c.status||'在籍')+'</span></td><td>'+yen(c.hourly)+'</td><td>'+ (c.joinedDate?dateJP(c.joinedDate):'—')+'</td><td>'+ (c.phone||'—')+'</td><td>'+ (c.memo||'—')+'</td><td><button class="text-button" onclick="editCastProfile(\''+c.id+'\')">編集・詳細</button></td></tr>').join('')||empty(7,'キャストを追加してください');
}
window.editCastProfile=id=>openForm('cast',id);window.editDailyInput=id=>openForm('dailyInput',id);
function renderShifts(){
  const [year,month]=data.month.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  const weekdays=['日','月','火','水','木','金','土'];
  const holidays={'2026-01-01':'元日','2026-01-12':'成人の日','2026-02-11':'建国記念の日','2026-02-23':'天皇誕生日','2026-03-20':'春分の日','2026-04-29':'昭和の日','2026-05-03':'憲法記念日','2026-05-04':'みどりの日','2026-05-05':'こどもの日','2026-05-06':'振替休日','2026-07-20':'海の日','2026-08-11':'山の日','2026-09-21':'敬老の日','2026-09-22':'国民の休日','2026-09-23':'秋分の日','2026-10-12':'スポーツの日','2026-11-03':'文化の日','2026-11-23':'勤労感謝の日'};
  const days=Array.from({length:count},(_,i)=>{const day=i+1,date=data.month+'-'+String(day).padStart(2,'0'),weekdayIndex=new Date(date+'T12:00:00').getDay();return {day,date,weekday:weekdays[weekdayIndex],weekdayIndex,holiday:holidays[date]||''};});
  $('#shiftMonthTitle').textContent=year+'年 '+month+'月 シフト表';$('.shift-table').style.setProperty('--shift-days',count);
  $('#shiftTableHead').innerHTML='<tr><th class="shift-name-head">キャスト</th>'+days.map(d=>'<th class="shift-day-head '+(d.holiday?'holiday ':d.weekdayIndex===0?'sunday':d.weekdayIndex===6?'saturday':'')+'">'+d.day+'<small>('+d.weekday+')</small>'+(d.holiday?'<em>'+d.holiday+'</em>':'')+'</th>').join('')+'</tr>';
  const counts='<tr class="shift-count-row"><th>出勤</th>'+days.map(d=>'<td>'+data.shifts.filter(x=>x.date===d.date).length+'人</td>').join('')+'</tr>';
  const castRows=sortedCasts().map(c=>'<tr><th class="shift-cast-name">'+c.name+'</th>'+days.map(d=>{const shift=data.shifts.find(x=>x.castId===c.id&&x.date===d.date);const label=shift?(shift.schedule||shift.hours+'h'):'';const cls=(shift?'has-shift ':'empty-shift ')+(d.holiday?'holiday ':d.weekdayIndex===0?'sunday':d.weekdayIndex===6?'saturday':'');return '<td class="'+cls+'"><button type="button" onclick="editShiftCell(&quot;'+c.id+'&quot;,&quot;'+d.date+'&quot;)">'+label+'</button></td>';}).join('')+'</tr>').join('');
  $('#shiftTableBody').innerHTML=counts+(castRows||'<tr><td class="empty" colspan="'+(count+1)+'">キャストを追加してください</td></tr>');
}
window.editShiftCell=(castId,date)=>{
  const existing=data.shifts.find(x=>x.castId===castId&&x.date===date);
  const answer=prompt('勤務時間・メモを自由に入力してください（例：8、8-12.5、×、休み）\\n空欄にすると削除します。',existing?(existing.schedule||existing.hours):'');
  if(answer===null)return;
  const value=answer.trim();
  if(value===''){data.shifts=data.shifts.filter(x=>!(x.castId===castId&&x.date===date));}
  else{const numeric=Number(value);if(existing){existing.schedule=value;if(Number.isFinite(numeric)&&numeric>=0)existing.hours=numeric;}else{data.shifts.push({date,castId,hours:Number.isFinite(numeric)&&numeric>=0?numeric:0,schedule:value,advance:0});}}
  save();render();
};
function renderExpenses(){const m={};data.expenses.forEach(x=>m[x.category]=(m[x.category]||0)+Number(x.amount));$('#expenseSummary').innerHTML=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>`<div class="category-card"><p>${x[0]}</p><strong>${yen(x[1])}</strong></div>`).join('')||'<div class="category-card"><p>支出を入力するとカテゴリ別に集計されます</p><strong>¥0</strong></div>';
$('#expenseTable').innerHTML=data.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${dateJP(x.date)}</td><td><span class="status">${x.category}</span></td><td>${x.company}</td><td>${x.note||'—'}</td><td>${yen(x.amount)}</td><td><button class="text-button" onclick="removeItem('expenses','${x.id}')">削除</button></td></tr>`).join('')||empty(6,'支出はまだありません');}
function renderSettings(){ const labels={mainNomination:'本指名バック（1本）',companion:'同伴バック（1本）',extension:'延長バック（1本）',drink:'ドリンクバック（1杯）',bottle:'ボトルバック（1本）',champagne:'シャンパンバック（1本）'};$('#backSettings').innerHTML=Object.entries(labels).map(([k,l])=>`<label class="setting-field">${l}<input data-setting="${k}" type="number" min="0" value="${data.settings[k]}"></label>`).join('');$('#deductionSettings').innerHTML=`<label class="setting-field">所得税（%）<input data-setting="taxRate" type="number" min="0" value="${data.settings.taxRate}"></label><label class="setting-field">厚生費（%）<input data-setting="welfareRate" type="number" min="0" value="${data.settings.welfareRate}"></label><label class="setting-field full">支出カテゴリ（カンマ区切り）<input id="categories" value="${data.settings.categories.join(',')}"></label>`;$('#castRateSettings').innerHTML=sortedCasts().map(c=>`<label class="cast-rate"><span>${c.name}<small> 基本時給</small></span><input data-hourly="${c.id}" type="number" min="0" value="${c.hourly}">円</label>`).join(''); }
const empty=(n,text)=>`<tr><td colspan="${n}" class="empty">${text}</td></tr>`;
function setView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));const h=document.querySelector(`#${id} h2`);$('#pageTitle').textContent=id==='dashboard'?'7月の営業状況':h.textContent;$('#monthButton').hidden=id==='cast-management';closeMenu();window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-view-target]').forEach(b=>b.onclick=()=>setView(b.dataset.viewTarget));
const dialog=$('#entryDialog'), form=$('#entryForm'), fields=$('#formFields');let mode='', slipDateSort='desc', editingCastId=null, editingDailyInputId=null;
function showEntryDialog(){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
function closeEntryDialog(){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.onclick=closeEntryDialog);
const field=(label,name,type='text',cls='')=>`<label class="field ${cls}">${label}<input required name="${name}" type="${type}"></label>`;
const optionalField=(label,name,type='text',cls='')=>`<label class="field ${cls}">${label}<input name="${name}" type="${type}"></label>`;
const timeField=(label,name)=>{
  if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return '<label class="field">'+label+'<input name="'+name+'" type="time" step="1800"></label>';
  const options=Array.from({length:24},(_,i)=>'<option value="'+String(i).padStart(2,'0')+'">'+String(i).padStart(2,'0')+'</option>').join('');
  const minutes=['00','30'].map(i=>'<option value="'+i+'">'+i+'</option>').join('');
  return '<label class="field time-picker-field">'+label+'<div class="desktop-time-picker" data-time-name="'+name+'"><select class="time-hour"><option value="">--</option>'+options+'</select><span>:</span><select class="time-minute"><option value="">--</option>'+minutes+'</select><input type="hidden" name="'+name+'"></div></label>';
};
function calculateWorkHours(){
  const start=fields.querySelector('[name="startTime"]')?.value,end=fields.querySelector('[name="endTime"]')?.value,hours=fields.querySelector('[name="hours"]');
  if(!start||!end||!hours)return;
  const minutes=value=>{const [h,m]=value.split(':').map(Number);return h*60+m;};
  let startMinutes=minutes(start),endMinutes=minutes(end);
  if(endMinutes<startMinutes){
    const startHour=Math.floor(startMinutes/60),endHour=Math.floor(endMinutes/60);
    endMinutes+=startHour>=7&&startHour<=12&&endHour<=6?12*60:24*60;
  }
  hours.value=String(Number(((endMinutes-startMinutes)/60).toFixed(2)));
}
function bindWorkHours(){fields.querySelectorAll('[name="startTime"],[name="endTime"]').forEach(input=>{input.oninput=calculateWorkHours;input.onchange=calculateWorkHours;});const hours=fields.querySelector('[name="hours"]');if(hours){hours.readOnly=true;hours.setAttribute('aria-label','出勤・退勤から自動計算される実働時間');}}
function bindDesktopTimePickers(){fields.querySelectorAll('.desktop-time-picker').forEach(picker=>{const hour=picker.querySelector('.time-hour'),minute=picker.querySelector('.time-minute'),target=picker.querySelector('input[type=hidden]');if(target.value){const [h,m]=target.value.split(':');hour.value=h;minute.value=m;}const update=()=>{target.value=hour.value&&minute.value?hour.value+':'+minute.value:'';calculateWorkHours();};hour.onchange=update;minute.onchange=update;});}
const batchTimePicker=kind=>'<div class="batch-time"><select class="batch-'+kind+'-hour"><option value="">--</option>'+Array.from({length:24},(_,i)=>'<option value="'+String(i).padStart(2,'0')+'">'+String(i).padStart(2,'0')+'</option>').join('')+'</select><span>:</span><select class="batch-'+kind+'-minute"><option value="">--</option><option value="00">00</option><option value="30">30</option></select></div>';
function calculateBatchHours(row){const start=row.querySelector('.batch-start-hour').value&&row.querySelector('.batch-start-minute').value?row.querySelector('.batch-start-hour').value+':'+row.querySelector('.batch-start-minute').value:'';const end=row.querySelector('.batch-end-hour').value&&row.querySelector('.batch-end-minute').value?row.querySelector('.batch-end-hour').value+':'+row.querySelector('.batch-end-minute').value:'';const output=row.querySelector('.batch-hours');if(!start||!end){output.value='';return '';}const parse=v=>{const [h,m]=v.split(':').map(Number);return h*60+m;};let a=parse(start),b=parse(end);if(b<a){const h=Math.floor(a/60),eh=Math.floor(b/60);b+=h>=7&&h<=12&&eh<=6?720:1440;}const hours=String(Number(((b-a)/60).toFixed(2)));output.value=hours;return hours;}
function bindBatchHours(){fields.querySelectorAll('.daily-batch-row').forEach(row=>row.querySelectorAll('select').forEach(select=>select.onchange=()=>calculateBatchHours(row)));}
function businessDate(){
  const d=new Date();
  if(d.getHours()<6)d.setDate(d.getDate()-1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function customerOptions(){
  return [...new Set(data.slips.map(x=>x.customerName).filter(Boolean))].map(name=>'<option value="'+String(name).replace(/"/g,'&quot;')+'"></option>').join('');
}
function payeeOptions(){return (data.settings.payeeHistory||[]).map(name=>'<option value="'+String(name).replace(/"/g,'&quot;')+'"></option>').join('');}
function expenseHistoryManager(){const chips=(items,type)=>items.map((name,index)=>'<button type="button" class="history-chip" data-history-type="'+type+'" data-history-index="'+index+'">'+name+' <b>×</b></button>').join('')||'<small>まだ履歴はありません</small>';return '<div class="expense-history full"><p>過去の履歴 <small>×で個別に削除できます</small></p><div class="history-group"><span>カテゴリ</span><div>'+chips(data.settings.categories,'category')+'</div></div><div class="history-group"><span>会社名・支払先</span><div>'+chips(data.settings.payeeHistory||[],'payee')+'</div></div></div>';}
function bindExpenseHistoryButtons(){fields.querySelectorAll('[data-history-type]').forEach(button=>button.onclick=()=>{const type=button.dataset.historyType,index=Number(button.dataset.historyIndex);const list=type==='category'?data.settings.categories:data.settings.payeeHistory;list.splice(index,1);save();openForm('expense');});}
function openForm(type,castId=null){mode=type;editingCastId=type==='cast'?castId:null;editingDailyInputId=type==='dailyInput'?castId:null;$('#deleteCastButton').hidden=!(type==='cast'&&editingCastId);$('#dialogKicker').textContent=type==='slip'?'SALES SLIP':type==='expense'?'EXPENSE':type==='shift'?'SHIFT':'CAST';
 if(type==='slip'){
   $('#dialogTitle').textContent='伝票を入力';
   fields.innerHTML=field('日付','date','date')+
   '<label class="field full">顧客名<input required name="customerName" list="customerHistory" autocomplete="off"></label><datalist id="customerHistory">'+customerOptions()+'</datalist>'+
   field('伝票番号','id','text')+field('売上','total','number')+
   '<label class="field">決済<select required name="payment"><option value="" selected disabled>選択してください</option><option value="現金">現金</option><option value="カード">カード</option></select></label>'+
   field('客数','guests','number')+
   '<label class="field"><span>指名</span><select required name="nominationType"><option value="" selected disabled>選択してください</option><option value="本指名">本指名</option><option value="同伴">同伴</option><option value="場内">場内</option></select></label>';
 }
 if(type==='expense'){ $('#dialogTitle').textContent='支出を入力';fields.innerHTML=field('支出日','date','date')+'<label class="field">カテゴリ<select name="category">'+data.settings.categories.map(x=>'<option>'+x+'</option>').join('')+'</select></label>'+field('新しい項目（必要なとき）','newCategory','text','full')+ '<label class="field">会社名・支払先<input required name="company" list="payeeHistory" autocomplete="off"></label><datalist id="payeeHistory">'+payeeOptions()+'</datalist>'+field('金額','amount','number')+field('内容（任意）','note','text','full')+expenseHistoryManager();bindExpenseHistoryButtons();}
 if(type==='dailyBatch'){ $('#dialogTitle').textContent='日別まとめ入力';const casts=sortedCasts().filter(c=>c.status!=='退店');fields.innerHTML=field('日付','date','date','full')+'<div class="daily-batch-list full">'+casts.map(c=>'<article class="daily-batch-row" data-cast-id="'+c.id+'"><b>'+c.name+'</b><div><small>出勤</small>'+batchTimePicker('start')+'</div><div><small>退勤</small>'+batchTimePicker('end')+'</div><label><small>実働</small><output class="batch-hours"></output></label><label><small>日払い</small><input class="batch-advance" type="number"></label><label><small>引き物</small><input class="batch-deduction" type="number"></label><label><small>場内</small><input class="batch-area" type="number"></label><label><small>本指名</small><input class="batch-main" type="number"></label><label><small>同伴</small><input class="batch-companion" type="number"></label><label><small>本指名売上</small><input class="batch-sales" type="number"></label></article>').join('')+'</div>'; }
 if(type==='dailyInput'){ const entry=data.dailyInputs.find(x=>x.id===editingDailyInputId);$('#dialogTitle').textContent=entry?'日別打込みを編集':'日別打込み';fields.innerHTML=field('日付','date','date')+'<label class="field">キャスト<select name="castId">'+sortedCasts().map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label>'+timeField('出勤','startTime')+timeField('退勤','endTime')+optionalField('実働時間','hours','number','auto-hours')+optionalField('日払い','advance','number')+optionalField('引き物','deduction','number')+optionalField('場内指名','areaNomination','number')+optionalField('本指名 本数','mainCount','number')+optionalField('同伴 本数','companionCount','number')+optionalField('本指名 売上','mainSales','number');if(entry)['date','castId','startTime','endTime','hours','advance','deduction','areaNomination','mainCount','companionCount','mainSales'].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.value=entry[name]??'';});}
 if(type==='shift'){ $('#dialogTitle').textContent='勤務を登録';fields.innerHTML=field('勤務日','date','date')+'<label class="field">キャスト<select name="castId">'+sortedCasts().map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label>'+field('実働時間','hours','number')+field('日払い','advance','number');}
 if(type==='cast'){ const cast=data.casts.find(c=>c.id===editingCastId);$('#dialogTitle').textContent=cast?'キャストを編集・詳細':'キャストを追加';fields.innerHTML=field('お名前','name')+'<label class="field">在籍状況<select name="status"><option>在籍</option><option>退店</option><option>体入</option><option>派遣</option></select></label>'+optionalField('入店日','joinedDate','date')+optionalField('退店日','leavingDate','date')+optionalField('誕生日','birthday','date')+optionalField('連絡先','phone','tel')+optionalField('基本時給','hourly','number')+'<label class="field full">メモ<textarea name="memo" rows="3"></textarea></label>';if(cast){['name','status','hourly','joinedDate','leavingDate','phone','birthday','memo'].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.value=cast[name]||(name==='status'?'在籍':'');});}}if(type==='cast'){const leavingDate=fields.querySelector('[name="leavingDate"]'),status=fields.querySelector('[name="status"]');leavingDate.onchange=()=>{if(leavingDate.value)status.value='退店';};}
 const now=new Date().toISOString().slice(0,10);if(!((type==='cast'&&editingCastId)||(type==='dailyInput'&&editingDailyInputId)))fields.querySelectorAll('input[type=date]').forEach(x=>{if(!(type==='cast'&&(x.name==='leavingDate'||x.name==='birthday')))x.value=now;});if((type==='slip'||type==='dailyInput'||type==='dailyBatch')&&!(type==='dailyInput'&&editingDailyInputId)){const dateField=fields.querySelector('input[name="date"]');if(dateField)dateField.value=businessDate();}if(type==='dailyInput'){bindDesktopTimePickers();bindWorkHours();calculateWorkHours();}if(type==='dailyBatch')bindBatchHours();showEntryDialog();
}
['addSlip','dashboardAddSlip'].forEach(id=>$('#'+id).onclick=e=>{e.preventDefault();openForm('slip')});
$('#sortSlipsDate').onclick=()=>{slipDateSort=slipDateSort==='asc'?'desc':'asc';renderSlips()};$('#addDailyInput').onclick=()=>openForm('dailyBatch');$('#addExpense').onclick=()=>openForm('expense');$('#addShift').onclick=()=>openForm('shift');$('#addShiftFromSchedule').onclick=()=>openForm('shift');$('#addCast').onclick=()=>openForm('cast');$('#addCastProfile').onclick=()=>openForm('cast');
form.addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const x=Object.fromEntries(new FormData(form));if(mode==='slip'){data.slips.push({id:x.id,date:x.date,customerName:x.customerName,total:+x.total,card:x.payment==='カード'?+x.total:0,payment:x.payment,groups:1,guests:+x.guests,nominationType:x.nominationType,casts:[]})}if(mode==='dailyBatch'){fields.querySelectorAll('.daily-batch-row').forEach(row=>{const value=cls=>row.querySelector(cls).value||'';const start=value('.batch-start-hour')&&value('.batch-start-minute')?value('.batch-start-hour')+':'+value('.batch-start-minute'):'';const end=value('.batch-end-hour')&&value('.batch-end-minute')?value('.batch-end-hour')+':'+value('.batch-end-minute'):'';const hours=calculateBatchHours(row);const advance=value('.batch-advance'),deduction=value('.batch-deduction'),area=value('.batch-area'),main=value('.batch-main'),companion=value('.batch-companion'),sales=value('.batch-sales');if(!start&&!end&&!advance&&!deduction&&!area&&!main&&!companion&&!sales)return;data.dailyInputs.push({id:'DI-'+Date.now()+'-'+row.dataset.castId,date:x.date,castId:row.dataset.castId,startTime:start,endTime:end,hours:+hours,advance:+advance,deduction:+deduction,areaNomination:+area,mainCount:+main,companionCount:+companion,mainSales:+sales});});}if(mode==='dailyInput'){const record={id:editingDailyInputId||'DI-'+Date.now(),date:x.date,castId:x.castId,startTime:x.startTime,endTime:x.endTime,hours:+x.hours,advance:+x.advance,deduction:+x.deduction,areaNomination:+x.areaNomination,mainCount:+x.mainCount,companionCount:+x.companionCount,mainSales:+x.mainSales};const existing=data.dailyInputs.find(item=>item.id===editingDailyInputId);if(existing)Object.assign(existing,record);else data.dailyInputs.push(record)}if(mode==='expense'){const category=(x.newCategory||'').trim()||x.category;if((x.newCategory||'').trim()&&!data.settings.categories.includes(category))data.settings.categories.push(category);if(!data.settings.payeeHistory.includes(x.company))data.settings.payeeHistory.push(x.company);data.expenses.push({id:'E-'+Date.now(),date:x.date,category,company:x.company,note:x.note,amount:+x.amount})}if(mode==='shift'){data.shifts.push({date:x.date,castId:x.castId,hours:+x.hours,advance:+x.advance})}if(mode==='cast'){const profile={name:x.name,hourly:+x.hourly,status:x.status,joinedDate:x.joinedDate,leavingDate:x.leavingDate,phone:x.phone,birthday:x.birthday,memo:x.memo};const existing=data.casts.find(c=>c.id===editingCastId);if(existing)Object.assign(existing,profile);else data.casts.push({id:'c-'+Date.now(),...profile})}save();render();dialog.close();});
window.removeItem=(type,id)=>{if(!confirm('このデータを削除しますか？'))return;data[type]=data[type].filter(x=>x.id!==id);save();render()};window.removeCast=id=>{if(!confirm('キャストを削除しますか？ 関連する過去データは残ります。'))return;data.casts=data.casts.filter(x=>x.id!==id);save();render()};window.deleteEditingCast=()=>{if(!editingCastId)return;if(!confirm('このキャストを削除しますか？ 関連する過去データは残ります。'))return;data.casts=data.casts.filter(x=>x.id!==editingCastId);save();render();closeEntryDialog();};
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
