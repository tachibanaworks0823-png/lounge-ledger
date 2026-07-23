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
  dailyStatuses: [],
  shifts: [
    { date:'2026-07-03',castId:'momo',hours:7.5,advance:5000 },{ date:'2026-07-04',castId:'momo',hours:7,advance:10000 },{ date:'2026-07-04',castId:'rina',hours:6,advance:5000 },{ date:'2026-07-10',castId:'rina',hours:7.5,advance:10000 },{ date:'2026-07-10',castId:'yui',hours:6,advance:5000 }
  ],
  shiftSpecials: [],
  expenses: [
    {id:'E-1',date:'2026-07-03',category:'酒代',company:'○○酒販',note:'営業用酒類',amount:984},{id:'E-2',date:'2026-07-04',category:'食材',company:'スーパー',note:'フルーツ・軽食',amount:1329},{id:'E-3',date:'2026-07-10',category:'備品',company:'通販',note:'紙おしぼり',amount:2400}
  ],
  settings:{ mainNomination:2500, companion:5000, extension:1500, drink:500, bottle:3000, champagne:7000, areaNomination:0, free1000:0, free1500:0, free2000:0, free2500:0, free3000:0, main1000:0, main1500:0, main2000:0, main2500:0, main3000:0, mainP:0, mainDecoration:0, mainBottle:0, mainChampagne:0, companion1000:0, companion1500:0, companion2000:0, companion2500:0, companion3000:0, companionP:0, companionDecoration:0, companionBottle:0, companionChampagne:0, taxRate:10, consumptionTax:0, welfarePerShift:0, categories:['酒代','食材','備品','カラオケ','印刷','通信費','組合費','交通費','家賃','ガス','その他'] }
};
function normalizeData(source){
  const value=source||{};
  return {...defaultData,...value,month:value.month||defaultData.month,casts:Array.isArray(value.casts)?value.casts:[],slips:Array.isArray(value.slips)?value.slips:[],dailyInputs:Array.isArray(value.dailyInputs)?value.dailyInputs:[],dailyStatuses:Array.isArray(value.dailyStatuses)?value.dailyStatuses:[],shifts:Array.isArray(value.shifts)?value.shifts:[],shiftSpecials:Array.isArray(value.shiftSpecials)?value.shiftSpecials:[],expenses:Array.isArray(value.expenses)?value.expenses:[],settings:{...defaultData.settings,...(value.settings||{}),categories:Array.isArray(value.settings?.categories)?value.settings.categories:defaultData.settings.categories,payeeHistory:Array.isArray(value.settings?.payeeHistory)?value.settings.payeeHistory:[...new Set((Array.isArray(value.expenses)?value.expenses:[]).map(x=>x.company).filter(Boolean))]}};
}
let data = normalizeData(JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultData);
const $ = s => document.querySelector(s); const yen = n => '¥' + new Intl.NumberFormat('ja-JP').format(Math.round(n||0));
const save = () => { localStorage.setItem(storageKey, JSON.stringify(data)); if(cloudUser){ clearTimeout(saveTimer); saveTimer=setTimeout(saveToCloud,500); } };
async function saveToCloud(){ const {error}=await supabaseClient.from('store_data').upsert({user_id:cloudUser.id,payload:data,updated_at:new Date().toISOString()}); if(error) console.error('Cloud save failed',error); }
async function loadFromCloud(){ const {data:row,error}=await supabaseClient.from('store_data').select('payload').eq('user_id',cloudUser.id).maybeSingle(); if(error){showAuthMessage('データベース設定を確認してください。');return;} if(row?.payload){data=normalizeData(row.payload);localStorage.setItem(storageKey,JSON.stringify(data));} render(); }
const castName = id => data.casts.find(x=>x.id===id)?.name || '退職キャスト';
const sortedCasts = () => data.casts.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja'));
const dateJP = d => new Date(d+'T12:00:00').toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
const isSelectedMonth = date => String(date||'').startsWith(data.month+'-');
const monthLabel = () => { const [year,month]=data.month.split('-').map(Number); return year+'年 '+month+'月'; };
const dateKey=value=>String(value||'').replace(/\//g,'-');
const todayKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const effectiveCastStatus=cast=>{const leaving=dateKey(cast.leavingDate);if(leaving&&leaving<=todayKey())return '退店';if(leaving&&cast.status==='退店')return '在籍';return cast.status||'在籍';};
const dailyBackKeys=['free1000','free1500','free2000','free2500','free3000','main1000','main1500','main2000','main2500','main3000','mainP','mainDecoration','mainBottle','mainChampagne','companion1000','companion1500','companion2000','companion2500','companion3000','companionP','companionDecoration','companionBottle','companionChampagne'];
function calcDailyInput(input){
  const cast=data.casts.find(c=>c.id===input.castId);
  const hours=Number(input.hours||0);
  const hourly=hours*Number(cast?.hourly||0);
  const back=Number(input.areaNomination||0)*Number(data.settings.areaNomination||0)
    +Number(input.mainCount||0)*Number(data.settings.mainNomination||0)
    +Number(input.companionCount||0)*Number(data.settings.companion||0)
    +dailyBackKeys.reduce((sum,key)=>sum+Number(input[key]||0)*Number(data.settings[key]||0),0);
  const gross=hourly+back;
  const deductions=Math.round(gross*(Number(data.settings.taxRate||0)+Number(data.settings.consumptionTax||0))/100)
    +Number(data.settings.welfarePerShift||0)+Number(input.deduction||0);
  const advance=Number(input.advance||0);
  return {hours,advance,back,hourly,gross,deductions,payout:Math.max(0,gross-deductions-advance)};
}
function calcCast(cast){
  const dailyInputs=data.dailyInputs.filter(x=>x.castId===cast.id&&isSelectedMonth(x.date));
  if(dailyInputs.length){
    const values=dailyInputs.map(calcDailyInput);
    const sum=key=>values.reduce((n,x)=>n+Number(x[key]||0),0);
    return {hours:sum('hours'),advance:sum('advance'),nominated:dailyInputs.reduce((n,x)=>n+Number(x.mainSales||0),0),main:dailyInputs.reduce((n,x)=>n+Number(x.mainCount||0),0),companion:dailyInputs.reduce((n,x)=>n+Number(x.companionCount||0),0),drink:0,bottle:0,back:sum('back'),hourly:sum('hourly'),gross:sum('gross'),deductions:sum('deductions'),payout:sum('payout')};
  }
  const slips=data.slips.filter(s=>isSelectedMonth(s.date)).flatMap(s=>(s.casts||[]).map(a=>({...a,date:s.date}))).filter(a=>a.castId===cast.id);
  const shifts=data.shifts.filter(x=>x.castId===cast.id&&isSelectedMonth(x.date)); const hours=shifts.reduce((n,x)=>n+Number(x.hours),0); const advance=shifts.reduce((n,x)=>n+Number(x.advance),0);
  const nominated=slips.filter(x=>x.type==='本指名').reduce((n,x)=>n+Number(x.sales),0); const main=slips.filter(x=>x.type==='本指名').length; const companion=slips.filter(x=>x.type==='同伴').length;
  const drink=slips.reduce((n,x)=>n+Number(x.drink),0), bottle=slips.reduce((n,x)=>n+Number(x.bottle),0), champagne=slips.reduce((n,x)=>n+Number(x.champagne),0), extension=slips.reduce((n,x)=>n+Number(x.extension),0);
  const back=main*data.settings.mainNomination + companion*data.settings.companion + extension*data.settings.extension + drink*data.settings.drink + bottle*data.settings.bottle + champagne*data.settings.champagne;
  const hourly=hours*cast.hourly, gross=hourly+back; const deductions=Math.round(gross*(Number(data.settings.taxRate||0)+Number(data.settings.consumptionTax||0))/100)+shifts.length*Number(data.settings.welfarePerShift||0);
  return {hours,advance,nominated,main,companion,drink,bottle,back,hourly,gross,deductions,payout:Math.max(0,gross-deductions-advance)};
}
function totals(){const sales=data.slips.filter(x=>isSelectedMonth(x.date)).reduce((n,x)=>n+Number(x.total),0);const expense=data.expenses.filter(x=>isSelectedMonth(x.date)).reduce((n,x)=>n+Number(x.amount),0);const payroll=data.casts.reduce((n,c)=>n+calcCast(c).payout,0);return {sales,expense,payroll,balance:sales-expense-payroll};}
function updateMonthUi(){ $('#monthButton').value=data.month;if($('#dashboard').classList.contains('active'))$('#pageTitle').textContent=monthLabel(); }
function render(){ updateMonthUi();renderDashboard();renderSlips();renderDailyInputs();renderCasts();renderCastManagement();renderShifts();renderExpenses();renderSettings(); }
function dailyRows(){
  const [year,month]=data.month.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  const weekdays=['日','月','火','水','木','金','土'];
  return Array.from({length:count},(_,i)=>{
    const date=data.month+'-'+String(i+1).padStart(2,'0');
    const slips=data.slips.filter(x=>x.date===date), expenses=data.expenses.filter(x=>x.date===date), shifts=data.shifts.filter(x=>x.date===date), dailyInputs=data.dailyInputs.filter(x=>x.date===date);
    const sales=slips.reduce((n,x)=>n+Number(x.total||0),0);
    const card=slips.reduce((n,x)=>n+Number(x.card||0),0);
    const groups=slips.reduce((n,x)=>n+Number(x.groups||0),0);
    const guests=slips.reduce((n,x)=>n+Number(x.guests||0),0);
    const nominated=slips.reduce((n,x)=>n+(x.casts||[]).reduce((m,c)=>m+Number(c.sales||0),0),0);
    const expense=expenses.reduce((n,x)=>n+Number(x.amount||0),0);
    const legacyAdvance=shifts.reduce((n,x)=>n+Number(x.advance||0),0);
    const legacyHourly=shifts.reduce((n,x)=>n+Number(x.hours||0)*(data.casts.find(c=>c.id===x.castId)?.hourly||0),0);
    const legacyBack=slips.reduce((n,slip)=>n+(slip.casts||[]).reduce((m,item)=>m+(item.type==='本指名'?Number(data.settings.mainNomination||0):0)+(item.type==='同伴'?Number(data.settings.companion||0):0)+Number(item.extension||0)*Number(data.settings.extension||0)+Number(item.drink||0)*Number(data.settings.drink||0)+Number(item.bottle||0)*Number(data.settings.bottle||0)+Number(item.champagne||0)*Number(data.settings.champagne||0),0),0);
    const legacyGross=legacyHourly+legacyBack;
    const legacyDeductions=Math.round(legacyGross*(Number(data.settings.taxRate||0)+Number(data.settings.consumptionTax||0))/100)+shifts.length*Number(data.settings.welfarePerShift||0);
    const dailyValues=dailyInputs.map(calcDailyInput);
    const dailySum=key=>dailyValues.reduce((n,x)=>n+Number(x[key]||0),0);
    const advance=dailyInputs.length?dailySum('advance'):legacyAdvance;
    const payroll=dailyInputs.length?dailySum('payout'):Math.max(0,legacyGross-legacyDeductions-legacyAdvance);
    const cash=Math.max(0,sales-card);
    return {date,day:i+1,weekday:weekdays[new Date(date+'T12:00:00').getDay()],sales,card,cash,groups,guests,nominated,expense,advance,payroll,cashBalance:cash-expense-advance};
  });
}
function renderDashboard(){
  const t=totals(),slips=data.slips.filter(x=>isSelectedMonth(x.date)),expenses=data.expenses.filter(x=>isSelectedMonth(x.date)); $('#totalSales').textContent=yen(t.sales);$('#salesCount').textContent=`伝票 ${slips.length}件`;$('#totalPayroll').textContent=yen(t.payroll);$('#payrollRatio').textContent=`${t.sales?Math.round(t.payroll/t.sales*100):0}%`;$('#totalExpenses').textContent=yen(t.expense);$('#expenseDetails').textContent=`経費 ${expenses.length}件`;$('#payrollDetails').textContent=`売上に対して ${t.sales?Math.round(t.payroll/t.sales*100):0}%`;
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
  const slips=data.slips.filter(x=>isSelectedMonth(x.date));
  $('#slipSummary').textContent=data.month.replace('-','年')+'月・'+slips.length+'件';
  $('#slipTable').innerHTML=slips.slice().sort((a,b)=>a.date.localeCompare(b.date)*direction).map(s=>{
    const payment=s.payment||(s.card?'カード':'現金');
    return '<tr><td>'+dateJP(s.date)+'</td><td>'+ (s.customerName||'—')+'</td><td>'+s.id+'</td><td>'+yen(s.total)+'</td><td><span class="status '+(payment==='カード'?'':'cash')+'">'+payment+'</span></td><td>'+s.guests+'名</td><td><button class="text-button" onclick="removeItem(\'slips\',\''+s.id+'\')">削除</button></td></tr>';
  }).join('')||empty(7,'伝票はまだありません');
}
function renderDailyInputs(){const [year,month]=data.month.split('-').map(Number),count=new Date(year,month,0).getDate(),grouped=new Map(),statuses=new Map(),inputs=data.dailyInputs.filter(x=>isSelectedMonth(x.date));inputs.forEach(x=>{if(!grouped.has(x.date))grouped.set(x.date,[]);grouped.get(x.date).push(x);});data.dailyStatuses.filter(x=>isSelectedMonth(x.date)).forEach(x=>statuses.set(x.date,x.status));const dates=Array.from({length:count},(_,i)=>data.month+'-'+String(i+1).padStart(2,'0')).sort((a,b)=>a.localeCompare(b)*(dailyInputDateSort==='asc'?1:-1));$('#dailyInputSummary').textContent=data.month.replace('-','年')+'月・'+inputs.length+'件';$('#sortDailyInputDate').textContent='日付 '+(dailyInputDateSort==='asc'?'↑':'↓');const options=status=>['営業','店休','キャスト0'].map(value=>'<option'+(status===value?' selected':'')+'>'+value+'</option>').join('');$('#dailyInputTable').innerHTML=dates.map(date=>{const entries=grouped.get(date)||[],status=statuses.get(date)||'営業',statusClass=status==='店休'?' is-closed':status==='キャスト0'?' is-zero':'';return '<tr><td><b>'+dateJP(date)+'</b></td><td><select class="daily-status-select'+statusClass+'" onchange="updateDailyStatus(\''+date+'\',this.value)">'+options(status)+'</select></td><td>'+entries.length+'人分</td><td><button class="primary-button compact-button" onclick="openDailyDateDetails(\''+date+'\')">詳細を見る</button></td></tr>';}).join('');}
function renderCasts(){ $('#castTable').innerHTML=sortedCasts().map(c=>{const x=calcCast(c);return `<tr><td><b>${c.name}</b><br><small>時給 ${yen(c.hourly)}</small></td><td>${yen(x.nominated)}</td><td>${x.main}本 / ${x.companion}本</td><td>${x.hours.toFixed(1)}h</td><td>${yen(x.hourly)}</td><td>${yen(x.back)}</td><td>${yen(x.deductions+x.advance)}</td><td><b>${yen(x.payout)}</b></td><td><button class="text-button" onclick="removeCast('${c.id}')">削除</button></td></tr>`}).join('')||empty(9,'キャストはまだいません'); }
const castAge=birthday=>{if(!birthday)return '—';const birth=new Date(birthday+'T00:00:00'),today=new Date();let years=today.getFullYear()-birth.getFullYear();if(today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate()))years--;return years+'歳';};
function renderCastManagement(){
  const row=c=>{const checked=[c.termsSigned,c.photoSubmitted,c.residenceCertificate].filter(Boolean).length;const checkLabel=checked===3?'確認済':'未確認 '+checked+'/3';const address=[c.address,c.building].filter(Boolean).join(' ')||'—';return '<tr><td><b>'+c.name+'</b></td><td>'+castAge(c.birthday)+'</td><td>'+ (c.memo||'—')+'</td><td><span class="cast-check-status '+(checked===3?'complete':'incomplete')+'">'+checkLabel+'</span></td><td><button class="text-button" onclick="copyCastAddress(\''+c.id+'\')">コピー</button></td><td>'+address+'</td><td><button class="text-button" onclick="editCastProfile(\''+c.id+'\')">編集・詳細</button></td></tr>';};
  const casts=sortedCasts(),active=casts.filter(c=>effectiveCastStatus(c)!=='退店'),retired=casts.filter(c=>effectiveCastStatus(c)==='退店');
  $('#castManagementActiveTable').innerHTML=active.map(row).join('')||empty(7,'在籍キャストはいません');
  $('#castManagementRetiredTable').innerHTML=retired.map(row).join('')||empty(7,'退店キャストはいません');
}
window.selectCastListTab=tab=>{document.querySelectorAll('.cast-list-tab').forEach(button=>{const active=button.textContent.trim()===(tab==='active'?'在籍':'退店');button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});document.querySelectorAll('[data-cast-list-panel]').forEach(panel=>{const active=panel.dataset.castListPanel===tab;panel.hidden=!active;panel.classList.toggle('active',active);});};

window.copyCastAddress=async id=>{const cast=data.casts.find(c=>c.id===id);const address=cast?.address||'';if(!address)return;try{await navigator.clipboard.writeText(address);alert('住所をコピーしました。');}catch(_error){const area=document.createElement('textarea');area.value=address;document.body.append(area);area.select();document.execCommand('copy');area.remove();alert('住所をコピーしました。');}};
window.editCastProfile=id=>openForm('cast',id);window.updateDailyStatus=(date,status)=>{const item=data.dailyStatuses.find(x=>x.date===date);if(item)item.status=status;else data.dailyStatuses.push({date,status});save();renderDailyInputs();};window.editDailyInput=id=>{if(dialog.open)closeEntryDialog();openForm('dailyInput',id);};window.openDailyDateDetails=date=>openForm('dailyDetails',date);
function renderShifts(){
  const [year,month]=data.month.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  const weekdays=['日','月','火','水','木','金','土'];
  const holidays={'2026-01-01':'元日','2026-01-12':'成人の日','2026-02-11':'建国記念の日','2026-02-23':'天皇誕生日','2026-03-20':'春分の日','2026-04-29':'昭和の日','2026-05-03':'憲法記念日','2026-05-04':'みどりの日','2026-05-05':'こどもの日','2026-05-06':'振替休日','2026-07-20':'海の日','2026-08-11':'山の日','2026-09-21':'敬老の日','2026-09-22':'国民の休日','2026-09-23':'秋分の日','2026-10-12':'スポーツの日','2026-11-03':'文化の日','2026-11-23':'勤労感謝の日'};
  const days=Array.from({length:count},(_,i)=>{const day=i+1,date=data.month+'-'+String(day).padStart(2,'0'),weekdayIndex=new Date(date+'T12:00:00').getDay();return {day,date,monthDay:month+'/'+day,weekday:weekdays[weekdayIndex],weekdayIndex,holiday:holidays[date]||'',shopClosed:data.dailyStatuses.some(item=>item.date===date&&item.status==='店休')};});
  const isExcludedShift=value=>/[×✕☓]/.test(String(value||''))||String(value||'').includes('当欠')||String(value||'').includes('無欠')||String(value||'').includes('休');
  const employmentDate=value=>String(value||'').replace(/\//g,'-');
  const isEmployedOn=(cast,date)=>{const joined=employmentDate(cast.joinedDate),leaving=employmentDate(cast.leavingDate);return (!joined||joined<=date)&&(!leaving||leaving>=date);};
  const visibleCasts=sortedCasts().filter(c=>days.some(d=>isEmployedOn(c,d.date)));
  $('#shiftMonthTitle').textContent=year+'年 '+month+'月 シフト表';$('.shift-table').style.setProperty('--shift-days',count);
  $('#shiftTableHead').innerHTML='<tr><th class="shift-name-head">キャスト</th>'+days.map(d=>'<th class="shift-day-head '+(d.shopClosed?'shop-closed ':([5,6].includes(d.weekdayIndex)?'friday-saturday ':''))+'">'+d.day+'<small>('+d.weekday+')</small>'+(d.holiday?'<em>'+d.holiday+'</em>':'')+'</th>').join('')+'</tr>';
  const counts='<tr class="shift-count-row"><th>出勤</th>'+days.map(d=>{const castCount=data.shifts.filter(x=>{const cast=data.casts.find(c=>c.id===x.castId);return x.date===d.date&&cast&&isEmployedOn(cast,d.date)&&!isExcludedShift(x.schedule);}).length,specialCount=data.shiftSpecials.filter(x=>x.date===d.date&&x.note).length;return '<td class="'+(d.shopClosed?'shop-closed ':'')+'">'+(d.shopClosed?'店休':castCount+'人 ('+specialCount+')')+'</td>';}).join('')+'</tr>';
  const specialRows=[['interview','面接・体入'],['trial','面接・体入']].map(([type,label])=>'<tr class="shift-special-row '+type+'"><th>'+label+'</th>'+days.map(d=>{const item=data.shiftSpecials.find(x=>x.type===type&&x.date===d.date);const value=item?.note||'';return '<td class="'+(d.shopClosed?'shop-closed ':'')+'"><button type="button" onclick="editShiftSpecial(&quot;'+type+'&quot;,&quot;'+d.date+'&quot;)">'+(d.shopClosed?'':value)+'</button></td>';}).join('')+'</tr>').join('');
  const castRows=visibleCasts.map(c=>'<tr><th class="shift-cast-name">'+c.name+'</th>'+days.map(d=>{if(!isEmployedOn(c,d.date))return '<td class="outside-employment"></td>';const shift=data.shifts.find(x=>x.castId===c.id&&x.date===d.date);const label=shift?(shift.schedule||shift.hours+'h'):'';const excluded=shift&&isExcludedShift(label);const cls=(shift?(excluded?'excluded-shift ':'has-shift '):'empty-shift ')+(d.shopClosed?'shop-closed ':'');return '<td class="'+cls+'"><button type="button" onclick="editShiftCell(&quot;'+c.id+'&quot;,&quot;'+d.date+'&quot;)">'+(d.shopClosed?'':label)+'</button></td>';}).join('')+'</tr>').join('');
  $('#shiftTableBody').innerHTML=counts+specialRows+(castRows||'<tr><td class="empty" colspan="'+(count+1)+'">キャストを追加してください</td></tr>');
  const periodGrid=(currentCast,title,periodDays)=>'<section class="cast-shift-period"><h4>'+title+'</h4><div class="cast-shift-days">'+periodDays.map(d=>{const shift=data.shifts.find(item=>item.castId===currentCast.id&&item.date===d.date);const rawLabel=shift?(shift.schedule||shift.hours+'h'):'';const label=d.shopClosed?'店休':(isExcludedShift(rawLabel)?'':rawLabel);const cls=(label?'has-value ':'')+(d.shopClosed?'shop-closed ':d.weekdayIndex===0?'sunday ':d.weekdayIndex===6?'saturday ':'');return '<div class="cast-shift-day '+cls+'"><span>'+d.monthDay+'（'+d.weekday+'）</span><b>'+label+'</b></div>';}).join('')+'</div></section>';
  const scheduleCasts=visibleCasts.filter(c=>data.shifts.some(item=>item.castId===c.id&&isEmployedOn(c,item.date)&&!isExcludedShift(item.schedule||item.hours)));
  if(!scheduleCasts.length){$('#shiftCastSummary').innerHTML='<p class="cast-shift-empty">シフトを入力すると、ここに個別送信用のシフト表が表示されます。</p>';}
  else{
    const selectedId=scheduleCasts.some(c=>c.id===window.shiftSummaryCastId)?window.shiftSummaryCastId:scheduleCasts[0].id;
    const currentCast=scheduleCasts.find(c=>c.id===selectedId);
    $('#shiftCastSummary').innerHTML='<label class="shift-cast-picker">送るキャストを選択<select id="shiftSummaryCast">'+scheduleCasts.map(c=>'<option value="'+c.id+'"'+(c.id===selectedId?' selected':'')+'>'+c.name+'</option>').join('')+'</select></label><article class="cast-shift-card"><h3>'+currentCast.name+'</h3>'+periodGrid(currentCast,'前期　1日〜16日',days.slice(0,16))+periodGrid(currentCast,'後期　17日〜末日',days.slice(16))+'</article>';
    $('#shiftSummaryCast').onchange=e=>{window.shiftSummaryCastId=e.target.value;renderShifts();};
  }
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
window.editShiftSpecial=(type,date)=>{
  const existing=data.shiftSpecials.find(x=>x.type===type&&x.date===date);
  const label=type==='interview'?'面接':'体入';
  const answer=prompt(label+'の予定・人数を入力してください（例：1名、19:00、さくら）\n空欄にすると削除します。',existing?.note||'');
  if(answer===null)return;
  const note=answer.trim();
  if(!note)data.shiftSpecials=data.shiftSpecials.filter(x=>!(x.type===type&&x.date===date));
  else if(existing)existing.note=note;
  else data.shiftSpecials.push({type,date,note});
  save();render();
};
function renderExpenses(){const m={},expenses=data.expenses.filter(x=>isSelectedMonth(x.date));expenses.forEach(x=>m[x.category]=(m[x.category]||0)+Number(x.amount));$('#expenseSummary').innerHTML=Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,4).map(x=>`<div class="category-card"><p>${x[0]}</p><strong>${yen(x[1])}</strong></div>`).join('')||'<div class="category-card"><p>支出を入力するとカテゴリ別に集計されます</p><strong>¥0</strong></div>';
$('#expenseTable').innerHTML=expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${dateJP(x.date)}</td><td><span class="status">${x.category}</span></td><td>${x.company}</td><td>${x.note||'—'}</td><td>${yen(x.amount)}</td><td><button class="text-button" onclick="removeItem('expenses','${x.id}')">削除</button></td></tr>`).join('')||empty(6,'支出はまだありません');}
function renderSettings(){ const labels={mainNomination:'本指名バック（1本）',companion:'同伴バック（1本）',areaNomination:'場内指名バック（1本）',extension:'延長バック（1本）'};const rate=(key,label)=>'<label class="setting-field">'+label+'<input data-setting="'+key+'" type="number" min="0" value="'+(data.settings[key]||0)+'"></label>';const groups=[['フリー・場内',['free1000','free1500','free2000','free2500','free3000']],['本指名',['main1000','main1500','main2000','main2500','main3000','mainP','mainDecoration','mainBottle','mainChampagne']],['同伴',['companion1000','companion1500','companion2000','companion2500','companion3000','companionP','companionDecoration','companionBottle','companionChampagne']]];const labels2={free1000:'1,000円',free1500:'1,500円',free2000:'2,000円',free2500:'2,500円',free3000:'3,000円',main1000:'1,000円',main1500:'1,500円',main2000:'2,000円',main2500:'2,500円',main3000:'3,000円',mainP:'P',mainDecoration:'飾り物',mainBottle:'ボトル',mainChampagne:'シャンパン',companion1000:'1,000円',companion1500:'1,500円',companion2000:'2,000円',companion2500:'2,500円',companion3000:'3,000円',companionP:'P',companionDecoration:'飾り物',companionBottle:'ボトル',companionChampagne:'シャンパン'};$('#backSettings').innerHTML='<div class="setting-rate-section full"><h3>基本バック</h3><div class="daily-rate-grid">'+Object.entries(labels).map(([k,l])=>rate(k,l)).join('')+'</div></div><div class="setting-rate-section daily-rate-section full">'+groups.map(([title,keys])=>'<section><h4>'+title+'</h4><div class="daily-rate-grid">'+keys.map(k=>rate(k,labels2[k])).join('')+'</div></section>').join('')+'</div>';$('#deductionSettings').innerHTML=`<label class="setting-field">所得税（%）<input data-setting="taxRate" type="number" min="0" value="${data.settings.taxRate||0}"></label><label class="setting-field">消費税（%）<input data-setting="consumptionTax" type="number" min="0" value="${data.settings.consumptionTax||0}"></label><label class="setting-field full">厚生費（1出勤につき）<input data-setting="welfarePerShift" type="number" min="0" value="${data.settings.welfarePerShift||0}"></label>`;$('#categorySettings').innerHTML=`<label class="setting-field full">支出カテゴリ（カンマ区切り）<input id="categories" value="${data.settings.categories.join(',')}"></label>`;$('#castRateSettings').innerHTML=sortedCasts().map(c=>`<label class="cast-rate"><span>${c.name}<small> 基本時給</small></span><input data-hourly="${c.id}" type="number" min="0" value="${c.hourly}">円</label>`).join(''); }
const empty=(n,text)=>`<tr><td colspan="${n}" class="empty">${text}</td></tr>`;
function setView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));const h=document.querySelector(`#${id} h2`);$('#pageTitle').textContent=id==='dashboard'?monthLabel():h.textContent;$('#monthButton').hidden=id==='cast-management';closeMenu();window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-view-target]').forEach(b=>b.onclick=()=>setView(b.dataset.viewTarget));const changeMonth=e=>{const value=e.target.value;if(!/^\d{4}-\d{2}$/.test(value))return;data.month=value;save();render();};$('#monthButton').onchange=changeMonth;$('#monthButton').oninput=changeMonth;
const dialog=$('#entryDialog'), form=$('#entryForm'), fields=$('#formFields');let mode='', slipDateSort='desc', dailyInputDateSort='desc', editingCastId=null, editingDailyInputId=null;
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
function bindBatchRow(row){row.querySelectorAll('select').forEach(select=>select.onchange=()=>calculateBatchHours(row));row.querySelector('.remove-batch-cast').onclick=()=>{const rows=fields.querySelectorAll('.daily-batch-row');if(rows.length===1){row.querySelectorAll('input').forEach(input=>input.value='');row.querySelectorAll('select').forEach(select=>select.value='');row.querySelector('.batch-hours').value='';return;}row.remove();};}
function bindBatchHours(){fields.querySelectorAll('.daily-batch-row').forEach(bindBatchRow);}
const backInputKeys=['free1000','free1500','free2000','free2500','free3000','main1000','main1500','main2000','main2500','main3000','mainP','mainDecoration','mainBottle','mainChampagne','companion1000','companion1500','companion2000','companion2500','companion3000','companionP','companionDecoration','companionBottle','companionChampagne'];
const backInputLabels={free1000:'1,000円',free1500:'1,500円',free2000:'2,000円',free2500:'2,500円',free3000:'3,000円',main1000:'1,000円',main1500:'1,500円',main2000:'2,000円',main2500:'2,500円',main3000:'3,000円',mainP:'P',mainDecoration:'飾り物',mainBottle:'ボトル',mainChampagne:'シャンパン',companion1000:'1,000円',companion1500:'1,500円',companion2000:'2,000円',companion2500:'2,500円',companion3000:'3,000円',companionP:'P',companionDecoration:'飾り物',companionBottle:'ボトル',companionChampagne:'シャンパン'};
const backGroups=[['フリー・場内',['free1000','free1500','free2000','free2500','free3000']],['本指名',['main1000','main1500','main2000','main2500','main3000','mainP','mainDecoration','mainBottle','mainChampagne']],['同伴',['companion1000','companion1500','companion2000','companion2500','companion3000','companionP','companionDecoration','companionBottle','companionChampagne']]];
const batchBackDetail=()=>'<details class="batch-back-detail"><summary>詳細打込み（フリー・場内／本指名／同伴）</summary>'+backGroups.map(([title,keys])=>'<section><h4>'+title+'</h4><div>'+keys.map(key=>'<label>'+backInputLabels[key]+'<input class="batch-'+key+'" type="number" min="0"></label>').join('')+'</div></section>').join('')+'</details>';
const dailyBackDetail=()=>'<details class="daily-back-detail full"><summary>詳細打込み（フリー・場内／本指名／同伴）</summary>'+backGroups.map(([title,keys])=>'<section><h4>'+title+'</h4><div>'+keys.map(key=>'<label>'+backInputLabels[key]+'<input name="'+key+'" type="number" min="0"></label>').join('')+'</div></section>').join('')+'</details>';
function batchCastRow(castId=''){const casts=sortedCasts().filter(c=>effectiveCastStatus(c)!=='退店');const options=casts.map(c=>'<option value="'+c.id+'"'+(c.id===castId?' selected':'')+'>'+c.name+'</option>').join('');return '<article class="daily-batch-row" data-cast-id="'+castId+'"><div class="batch-cast-head"><label><small>キャスト</small><select class="batch-cast-select">'+options+'</select></label><button type="button" class="text-button remove-batch-cast">削除</button></div><div><small>出勤</small>'+batchTimePicker('start')+'</div><div><small>退勤</small>'+batchTimePicker('end')+'</div><label><small>実働</small><output class="batch-hours"></output></label><label><small>日払い</small><input class="batch-advance" type="number"></label><label><small>引き物</small><input class="batch-deduction" type="number"></label><label><small>場内</small><input class="batch-area" type="number"></label><label><small>本指名</small><input class="batch-main" type="number"></label><label><small>同伴</small><input class="batch-companion" type="number"></label><label><small>本指名売上</small><input class="batch-sales" type="number"></label>'+batchBackDetail()+'</article>';}
window.addBatchCastRow=()=>{const list=$('#batchCastList');list.insertAdjacentHTML('beforeend',batchCastRow());const row=list.lastElementChild;row.dataset.castId=row.querySelector('.batch-cast-select').value;bindBatchRow(row);row.querySelector('.batch-cast-select').onchange=()=>row.dataset.castId=row.querySelector('.batch-cast-select').value;};
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
function renderShiftBatchRows(){
  const castId=fields.querySelector('[name="castId"]')?.value;
  const [year,month]=data.month.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  const weekdays=['日','月','火','水','木','金','土'];
  const list=fields.querySelector('.shift-batch-list');
  if(!list||!castId)return;
  list.innerHTML=Array.from({length:count},(_,i)=>{
    const day=i+1,date=data.month+'-'+String(day).padStart(2,'0');
    const existing=data.shifts.find(item=>item.date===date&&item.castId===castId);
    const value=existing?(existing.schedule??existing.hours??''):'';
    return '<label class="shift-batch-row" data-date="'+date+'"><b>'+month+'/'+day+'（'+weekdays[new Date(date+'T12:00:00').getDay()]+'）</b><input class="shift-batch-value" value="'+String(value).replace(/"/g,'&quot;')+'" placeholder="例：8、8-12.5、×、休み"></label>';
  }).join('');
}
function openForm(type,castId=null){mode=type;form.autocomplete=type==='cast'?'off':'on';fields.classList.toggle('cast-profile-fields',type==='cast');editingCastId=type==='cast'?castId:null;editingDailyInputId=type==='dailyInput'?castId:null;form.querySelector('[value="save"]').hidden=type==='dailyDetails';$('#deleteCastButton').hidden=!(type==='cast'&&editingCastId);$('#dialogKicker').textContent=type==='slip'?'SALES SLIP':type==='expense'?'EXPENSE':(type==='shift'||type==='shiftBatch'||type==='shopClosed')?'SHIFT':'CAST';
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
 if(type==='dailyBatch'){ $('#dialogTitle').textContent='日別まとめ入力';const first=sortedCasts().find(c=>effectiveCastStatus(c)!=='退店')?.id||'';fields.innerHTML=field('日付','date','date')+'<label class="field">営業ステータス<select name="businessStatus"><option>営業</option><option>店休</option><option>キャスト0</option></select></label>'+'<div class="batch-toolbar full"><span>キャストを選択して入力してください</span><button type="button" class="secondary-button" onclick="addBatchCastRow()">＋ キャストを追加</button></div><div class="daily-batch-list full" id="batchCastList">'+batchCastRow(first)+'</div>'; }
 if(type==='dailyDetails'){const date=castId,entries=data.dailyInputs.filter(x=>x.date===date);$('#dialogTitle').textContent=dateJP(date)+' の詳細';fields.innerHTML='<div class="daily-detail-list full">'+entries.map(x=>'<article><b>'+castName(x.castId)+'</b><span>出勤 '+(x.startTime||'—')+' / 退勤 '+(x.endTime||'—')+' / 実働 '+(x.hours?x.hours+'h':'—')+'</span><span>日払い '+yen(x.advance)+' ・ 引き物 '+yen(x.deduction)+' ・ 場内 '+Number(x.areaNomination||0)+'本 ・ 本指名 '+Number(x.mainCount||0)+'本 ・ 同伴 '+Number(x.companionCount||0)+'本 ・ 本指名売上 '+yen(x.mainSales)+'</span><div><button type="button" class="text-button" onclick="editDailyInput(\''+x.id+'\')">編集</button><button type="button" class="text-button" onclick="removeItem(\'dailyInputs\',\''+x.id+'\')">削除</button></div></article>').join('')+'</div>'; }
 if(type==='dailyInput'){ const entry=data.dailyInputs.find(x=>x.id===editingDailyInputId);$('#dialogTitle').textContent=entry?'日別打込みを編集':'日別打込み';fields.innerHTML=field('日付','date','date')+'<label class="field">キャスト<select name="castId">'+sortedCasts().map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label>'+timeField('出勤','startTime')+timeField('退勤','endTime')+optionalField('実働時間','hours','number','auto-hours')+optionalField('日払い','advance','number')+optionalField('引き物','deduction','number')+optionalField('場内指名','areaNomination','number')+optionalField('本指名 本数','mainCount','number')+optionalField('同伴 本数','companionCount','number')+optionalField('本指名 売上','mainSales','number')+dailyBackDetail();if(entry)['date','castId','startTime','endTime','hours','advance','deduction','areaNomination','mainCount','companionCount','mainSales',...backInputKeys].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.value=entry[name]??'';});}
 if(type==='shiftBatch'){ $('#dialogTitle').textContent='キャスト別シフトを一括入力';const casts=sortedCasts().filter(c=>effectiveCastStatus(c)!=='退店');fields.innerHTML='<label class="field full">キャスト<select name="castId">'+casts.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label><div class="shift-batch-list full"></div>';fields.querySelector('[name="castId"]').onchange=renderShiftBatchRows;renderShiftBatchRows(); }
 if(type==='shopClosed'){ $('#dialogTitle').textContent='店休を設定・解除';fields.innerHTML=field('店休日','date','date','full')+'<button class="text-button shop-closed-remove full" type="button">店休を解除</button>';fields.querySelector('.shop-closed-remove').onclick=()=>{const date=fields.querySelector('[name="date"]').value;if(!date)return;data.dailyStatuses=data.dailyStatuses.filter(item=>!(item.date===date&&item.status==='店休'));save();render();dialog.close();};}
 if(type==='shift'){ $('#dialogTitle').textContent='勤務を登録';fields.innerHTML=field('勤務日','date','date')+'<label class="field">キャスト<select name="castId">'+sortedCasts().map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label>'+field('実働時間','hours','number')+field('日払い','advance','number');}
 if(type==='cast'){ const cast=data.casts.find(c=>c.id===editingCastId);$('#dialogTitle').textContent=cast?'キャストを編集・詳細':'キャストを追加';fields.innerHTML='<div class="cast-form-section full"><h3>ステータス</h3></div>'+field('キャスト名','name')+'<label class="field">在籍状況<select name="status"><option>在籍</option><option>退店</option><option>体入</option><option>派遣</option></select></label>'+optionalField('入店日','joinedDate','date')+optionalField('退店日','leavingDate','date')+optionalField('氏名（姓）','lastName')+optionalField('氏名（名）','firstName')+'<label class="field birth-field">生年月日<input name="birthday" type="date"></label><label class="field age-field">年齢<output class="cast-age">年齢：—</output></label>'+'<div class="cast-contact-row full">'+optionalField('連絡先','phone','tel')+optionalField('緊急連絡先','emergencyContact','tel')+optionalField('関係','emergencyRelation')+'</div>'+optionalField('住所','address')+optionalField('建物','building')+'<label class="field full">メモ<textarea name="memo" rows="3"></textarea></label><section class="cast-checklist full"><h3>確認項目</h3><label><input type="checkbox" name="termsSigned">規約サイン</label><label><input type="checkbox" name="photoSubmitted">写真</label><label><input type="checkbox" name="residenceCertificate">住民票</label></section>';form.autocomplete='off';fields.querySelectorAll('input:not([type="checkbox"]),textarea').forEach(input=>input.autocomplete='new-password');if(cast){['name','status','joinedDate','leavingDate','lastName','firstName','birthday','phone','emergencyContact','emergencyRelation','address','building','memo'].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.value=cast[name]||(name==='status'?'在籍':'');});['termsSigned','photoSubmitted','residenceCertificate'].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.checked=Boolean(cast[name]);});fields.querySelector('[name="status"]').value=effectiveCastStatus(cast);}}if(type==='cast'){const leavingDate=fields.querySelector('[name="leavingDate"]'),status=fields.querySelector('[name="status"]'),birthday=fields.querySelector('[name="birthday"]'),age=fields.querySelector('.cast-age');const updateAge=()=>{if(!birthday.value){age.textContent='年齢：—';return;}const birth=new Date(birthday.value+'T00:00:00'),today=new Date();let years=today.getFullYear()-birth.getFullYear();const beforeBirthday=today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate());if(beforeBirthday)years--;age.textContent='年齢：'+years+'歳';};leavingDate.onchange=()=>{if(leavingDate.value)status.value=dateKey(leavingDate.value)<=todayKey()?'退店':(status.value==='退店'?'在籍':status.value);};birthday.onchange=updateAge;updateAge();}
 const now=new Date().toISOString().slice(0,10);if(!((type==='cast'&&editingCastId)||(type==='dailyInput'&&editingDailyInputId)))fields.querySelectorAll('input[type=date]').forEach(x=>{if(!(type==='cast'&&(x.name==='leavingDate'||x.name==='birthday')))x.value=now;});if((type==='slip'||type==='dailyInput'||type==='dailyBatch')&&!(type==='dailyInput'&&editingDailyInputId)){const dateField=fields.querySelector('input[name="date"]');if(dateField)dateField.value=businessDate();}if(type==='dailyInput'){bindDesktopTimePickers();bindWorkHours();calculateWorkHours();}if(type==='dailyBatch')bindBatchHours();showEntryDialog();
}
['addSlip','dashboardAddSlip'].forEach(id=>$('#'+id).onclick=e=>{e.preventDefault();openForm('slip')});
$('#sortSlipsDate').onclick=()=>{slipDateSort=slipDateSort==='asc'?'desc':'asc';renderSlips()};$('#sortDailyInputDate').onclick=()=>{dailyInputDateSort=dailyInputDateSort==='asc'?'desc':'asc';renderDailyInputs()};$('#addDailyInput').onclick=()=>openForm('dailyBatch');$('#addExpense').onclick=()=>openForm('expense');$('#addShift').onclick=()=>openForm('shift');$('#addShiftBatch').onclick=()=>openForm('shiftBatch');$('#addShopClosed').onclick=()=>openForm('shopClosed');$('#addCast').onclick=()=>openForm('cast');$('#addCastProfile').onclick=()=>openForm('cast');
form.addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const x=Object.fromEntries(new FormData(form));if(mode==='slip'){data.slips.push({id:x.id,date:x.date,customerName:x.customerName,total:+x.total,card:x.payment==='カード'?+x.total:0,payment:x.payment,groups:1,guests:+x.guests,nominationType:x.nominationType,casts:[]})}if(mode==='dailyBatch'){const currentStatus=data.dailyStatuses.find(item=>item.date===x.date);if(currentStatus)currentStatus.status=x.businessStatus;else data.dailyStatuses.push({date:x.date,status:x.businessStatus});fields.querySelectorAll('.daily-batch-row').forEach(row=>{const value=cls=>row.querySelector(cls).value||'';const start=value('.batch-start-hour')&&value('.batch-start-minute')?value('.batch-start-hour')+':'+value('.batch-start-minute'):'';const end=value('.batch-end-hour')&&value('.batch-end-minute')?value('.batch-end-hour')+':'+value('.batch-end-minute'):'';const hours=calculateBatchHours(row);const advance=value('.batch-advance'),deduction=value('.batch-deduction'),area=value('.batch-area'),main=value('.batch-main'),companion=value('.batch-companion'),sales=value('.batch-sales'),back={};backInputKeys.forEach(key=>back[key]=+value('.batch-'+key));if(!start&&!end&&!advance&&!deduction&&!area&&!main&&!companion&&!sales&&!backInputKeys.some(key=>back[key]))return;data.dailyInputs.push({id:'DI-'+Date.now()+'-'+row.dataset.castId,date:x.date,castId:row.querySelector('.batch-cast-select').value,startTime:start,endTime:end,hours:+hours,advance:+advance,deduction:+deduction,areaNomination:+area,mainCount:+main,companionCount:+companion,mainSales:+sales,...back});});}if(mode==='dailyInput'){const record={id:editingDailyInputId||'DI-'+Date.now(),date:x.date,castId:x.castId,startTime:x.startTime,endTime:x.endTime,hours:+x.hours,advance:+x.advance,deduction:+x.deduction,areaNomination:+x.areaNomination,mainCount:+x.mainCount,companionCount:+x.companionCount,mainSales:+x.mainSales,...Object.fromEntries(backInputKeys.map(key=>[key,+(x[key]||0)]))};const existing=data.dailyInputs.find(item=>item.id===editingDailyInputId);if(existing)Object.assign(existing,record);else data.dailyInputs.push(record)}if(mode==='expense'){const category=(x.newCategory||'').trim()||x.category;if((x.newCategory||'').trim()&&!data.settings.categories.includes(category))data.settings.categories.push(category);if(!data.settings.payeeHistory.includes(x.company))data.settings.payeeHistory.push(x.company);data.expenses.push({id:'E-'+Date.now(),date:x.date,category,company:x.company,note:x.note,amount:+x.amount})}if(mode==='shiftBatch'){const castId=x.castId;fields.querySelectorAll('.shift-batch-row').forEach(row=>{const value=row.querySelector('.shift-batch-value').value.trim();if(!value)return;const date=row.dataset.date,numeric=Number(value),existing=data.shifts.find(item=>item.date===date&&item.castId===castId);const record={date,castId,hours:Number.isFinite(numeric)&&numeric>=0?numeric:0,schedule:value,advance:existing?.advance||0};if(existing)Object.assign(existing,record);else data.shifts.push(record);});}if(mode==='shopClosed'){const existing=data.dailyStatuses.find(item=>item.date===x.date);if(existing)existing.status='店休';else data.dailyStatuses.push({date:x.date,status:'店休'});}if(mode==='shift'){data.shifts.push({date:x.date,castId:x.castId,hours:+x.hours,advance:+x.advance})}if(mode==='cast'){const profile={name:x.name,status:x.status,joinedDate:x.joinedDate,leavingDate:x.leavingDate,lastName:x.lastName,firstName:x.firstName,birthday:x.birthday,phone:x.phone,emergencyContact:x.emergencyContact,emergencyRelation:x.emergencyRelation,address:x.address,building:x.building,memo:x.memo,termsSigned:Boolean(x.termsSigned),photoSubmitted:Boolean(x.photoSubmitted),residenceCertificate:Boolean(x.residenceCertificate)};const existing=data.casts.find(c=>c.id===editingCastId);if(existing)Object.assign(existing,profile);else data.casts.push({id:'c-'+Date.now(),hourly:0,...profile})}save();render();dialog.close();});
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
