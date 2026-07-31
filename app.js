window.SUPABASE_URL ??= 'https://ojrdymzceyfqjjnhleqh.supabase.co';
window.SUPABASE_PUBLISHABLE_KEY ??= 'sb_publishable_dppPYAR_cf23aziHH4g_tA_eMvEGdf4';

const storageKey = 'lounge-ledger-v1';
const supabaseClient = window.supabase?.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
let cloudUser = null, saveTimer = null, cloudLoaded = false, lastCloudScore = 0, authLoading = false;
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
  payrollAdjustments: [],
  dailyStatuses: [],
  dailyLedgerExpenses: [],
  dailyLedgerSales: [],
  dailyLedgerAdvances: [],
  shifts: [
    { date:'2026-07-03',castId:'momo',hours:7.5,advance:5000 },{ date:'2026-07-04',castId:'momo',hours:7,advance:10000 },{ date:'2026-07-04',castId:'rina',hours:6,advance:5000 },{ date:'2026-07-10',castId:'rina',hours:7.5,advance:10000 },{ date:'2026-07-10',castId:'yui',hours:6,advance:5000 }
  ],
  shiftSpecials: [],
  applications: [],
  expenses: [
    {id:'E-1',date:'2026-07-03',category:'酒代',company:'○○酒販',note:'営業用酒類',amount:984},{id:'E-2',date:'2026-07-04',category:'食材',company:'スーパー',note:'フルーツ・軽食',amount:1329},{id:'E-3',date:'2026-07-10',category:'備品',company:'通販',note:'紙おしぼり',amount:2400}
  ],
  settings:{ mainNomination:2500, companion:5000, extension:1500, drink:500, bottle:3000, champagne:7000, areaNomination:0, free1000:0, free1500:0, free2000:0, free2500:0, free3000:0, main1000:0, main1500:0, main2000:0, main2500:0, main3000:0, mainP:0, mainDecoration:0, mainBottle:0, mainChampagne:0, companion1000:0, companion1500:0, companion2000:0, companion2500:0, companion3000:0, companionP:0, companionDecoration:0, companionBottle:0, companionChampagne:0, taxRate:10, consumptionTax:0, welfarePerShift:0, deductionPerShift:0, monthlyMainCompanionStep:0, monthlyMainCompanionAdd:0, monthlyCompanionStep:0, monthlyCompanionAdd:0, monthlySalesStep:0, monthlySalesAdd:0, categories:['酒代','食材','備品','カラオケ','印刷','通信費','組合費','交通費','家賃','ガス','その他'], applicationMedia:['ポケパラ','ナイツネット','体入ショコラ','紹介','その他'], hiddenCustomerNames:[], hiddenExpenseOptions:{categories:[],payees:[]}, payeeCategories:{}, customerNameOrder:[], paymentMethods:[{name:'現金',category:'cash'},{name:'カード',category:'card'},{name:'未収',category:'receivable'}] }
};
function normalizeData(source){
  const value=source||{};
  return {...defaultData,...value,month:value.month||defaultData.month,casts:Array.isArray(value.casts)?value.casts:[],slips:Array.isArray(value.slips)?value.slips:[],dailyInputs:Array.isArray(value.dailyInputs)?value.dailyInputs:[],payrollAdjustments:Array.isArray(value.payrollAdjustments)?value.payrollAdjustments:[],dailyStatuses:Array.isArray(value.dailyStatuses)?value.dailyStatuses:[],dailyLedgerExpenses:Array.isArray(value.dailyLedgerExpenses)?value.dailyLedgerExpenses:[],dailyLedgerSales:Array.isArray(value.dailyLedgerSales)?value.dailyLedgerSales:[],dailyLedgerAdvances:Array.isArray(value.dailyLedgerAdvances)?value.dailyLedgerAdvances:[],shifts:Array.isArray(value.shifts)?value.shifts:[],shiftSpecials:Array.isArray(value.shiftSpecials)?value.shiftSpecials:[],applications:Array.isArray(value.applications)?value.applications:[],expenses:Array.isArray(value.expenses)?value.expenses:[],settings:{...defaultData.settings,...(value.settings||{}),categories:Array.isArray(value.settings?.categories)?value.settings.categories:defaultData.settings.categories,applicationMedia:Array.isArray(value.settings?.applicationMedia)?value.settings.applicationMedia:defaultData.settings.applicationMedia,hiddenCustomerNames:Array.isArray(value.settings?.hiddenCustomerNames)?value.settings.hiddenCustomerNames:defaultData.settings.hiddenCustomerNames,hiddenExpenseOptions:{categories:Array.isArray(value.settings?.hiddenExpenseOptions?.categories)?value.settings.hiddenExpenseOptions.categories:[],payees:Array.isArray(value.settings?.hiddenExpenseOptions?.payees)?value.settings.hiddenExpenseOptions.payees:[]},payeeCategories:value.settings?.payeeCategories&&typeof value.settings.payeeCategories==='object'&&!Array.isArray(value.settings.payeeCategories)?value.settings.payeeCategories:{},customerNameOrder:Array.isArray(value.settings?.customerNameOrder)?value.settings.customerNameOrder:defaultData.settings.customerNameOrder,paymentMethods:Array.isArray(value.settings?.paymentMethods)&&value.settings.paymentMethods.length?value.settings.paymentMethods.filter(item=>item&&item.name):defaultData.settings.paymentMethods,payeeHistory:Array.isArray(value.settings?.payeeHistory)?value.settings.payeeHistory:[...new Set((Array.isArray(value.expenses)?value.expenses:[]).map(x=>x.company).filter(Boolean))]}};
}
let data = normalizeData(JSON.parse(localStorage.getItem(storageKey) || 'null') || defaultData);
const $ = s => document.querySelector(s);
const pullRefreshIndicator=$('#pullRefreshIndicator');
let pullStartY=0,pullStartX=0,pullDistance=0,pullingToRefresh=false;
const canPullRefresh=()=>window.innerWidth<=780&&window.scrollY<=0&&!document.querySelector('dialog[open]')&&!$('#authScreen').classList.contains('hidden');
document.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||window.scrollY>0||document.querySelector('dialog[open]')||!$('#authScreen').classList.contains('hidden')){pullingToRefresh=false;return;}
  pullStartY=event.touches[0].clientY;pullStartX=event.touches[0].clientX;pullDistance=0;pullingToRefresh=true;
},{passive:true});
document.addEventListener('touchmove',event=>{
  if(!pullingToRefresh||event.touches.length!==1)return;
  const y=event.touches[0].clientY,x=event.touches[0].clientX,dy=y-pullStartY,dx=x-pullStartX;
  if(dy<=0||Math.abs(dx)>Math.abs(dy)){pullingToRefresh=false;pullRefreshIndicator.classList.remove('is-pulling','is-ready');return;}
  pullDistance=Math.min(dy,108);
  if(pullDistance>8){event.preventDefault();pullRefreshIndicator.classList.add('is-pulling');pullRefreshIndicator.classList.toggle('is-ready',pullDistance>=72);pullRefreshIndicator.textContent=pullDistance>=72?'離して更新':'↓ 引っ張って更新';}
},{passive:false});
document.addEventListener('touchend',()=>{
  if(!pullingToRefresh)return;
  const shouldRefresh=pullDistance>=72;
  pullingToRefresh=false;pullDistance=0;pullRefreshIndicator.classList.remove('is-ready');
  if(shouldRefresh){pullRefreshIndicator.textContent='更新しています…';pullRefreshIndicator.classList.add('is-pulling');window.location.reload();}
  else{pullRefreshIndicator.classList.remove('is-pulling');pullRefreshIndicator.textContent='↓ 更新する';}
},{passive:true}); const yen = n => {
  const value=Number(n||0);
  return (value<0?'-':'')+'¥'+new Intl.NumberFormat('ja-JP').format(Math.round(Math.abs(value)));
};
function markNegativeAmounts(scope=document){
  scope.querySelectorAll('*').forEach(element=>{
    if(element.children.length||/^(INPUT|TEXTAREA|SELECT|OPTION)$/i.test(element.tagName))return;
    element.classList.toggle('negative-amount',/-¥[0-9]/.test(element.textContent||''));
  });
}
const clonePayload=value=>JSON.parse(JSON.stringify(value));
const snapshotData=value=>{const snapshot=clonePayload(value);delete snapshot._backups;return snapshot;};
const dataScore=value=>{
  const v=value||{};
  return (v.casts?.length||0)+(v.slips?.length||0)*3+(v.expenses?.length||0)*2+
    (v.dailyInputs?.length||0)*2+(v.shifts?.length||0)+(v.applications?.length||0);
};
const localBackupKey=()=>storageKey+'-backups-'+(cloudUser?.id||'guest');
const archiveLocalSnapshot=value=>{
  try{
    const snapshot=snapshotData(value), key=localBackupKey();
    const history=JSON.parse(localStorage.getItem(key)||'[]');
    const latest=history[0]?.payload;
    if(!latest||JSON.stringify(latest)!==JSON.stringify(snapshot)){
      history.unshift({savedAt:new Date().toISOString(),payload:snapshot});
      localStorage.setItem(key,JSON.stringify(history.slice(0,20)));
    }
  }catch(error){console.error('Local backup failed',error);}
};
const save = () => {
  localStorage.setItem(storageKey, JSON.stringify(data));
  archiveLocalSnapshot(data);
  // クラウドの読込完了前に初期データで上書きしないため、保存は読込後だけに限定する。
  if(cloudUser && cloudLoaded){ clearTimeout(saveTimer); saveTimer=setTimeout(saveToCloud,500); }
};
async function saveToCloud(){
  if(!cloudUser || !cloudLoaded) return false;
  const snapshot=snapshotData(data), score=dataScore(snapshot);
  if(lastCloudScore>0 && score===0){
    console.error('Cloud save stopped: unexpected empty payload');
    showAuthMessage('データ保護のため、空のデータ保存を停止しました。再読み込みしてください。');
    return false;
  }
  try{
    const previous=Array.isArray(data._backups)?data._backups:[];
    const latest=previous[0]?.payload;
    const backups=(!latest||JSON.stringify(latest)!==JSON.stringify(snapshot))
      ? [{savedAt:new Date().toISOString(),payload:snapshot},...previous].slice(0,12)
      : previous.slice(0,12);
    const payload={...snapshot,_backups:backups};
    const {error}=await supabaseClient.from('store_data').upsert({user_id:cloudUser.id,payload,updated_at:new Date().toISOString()});
    if(error){console.error('Cloud save failed',error);return false;}
    data._backups=backups;
    lastCloudScore=score;
    localStorage.setItem(storageKey,JSON.stringify(data));
    return true;
  }catch(error){
    console.error('Cloud save failed',error);
    return false;
  }
}
async function isCastDeletionStored(castId){
  try{
    const {data:row,error}=await supabaseClient.from('store_data').select('payload').eq('user_id',cloudUser.id).maybeSingle();
    if(error) return false;
    return !normalizeData(row?.payload).casts.some(cast=>cast.id===castId);
  }catch(error){
    console.error('Cast deletion verification failed',error);
    return false;
  }
}
async function commitCastDeletion(previousData,castId){
  clearTimeout(saveTimer);
  for(let attempt=0;attempt<3;attempt++){
    const saved=await saveToCloud();
    if(saved&&await isCastDeletionStored(castId)) return true;
    if(attempt<2) await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
  }
  data=normalizeData(previousData);
  localStorage.setItem(storageKey,JSON.stringify(data));
  archiveLocalSnapshot(data);
  render();
  alert('削除をサーバーへ保存できませんでした。削除は取り消しました。');
  return false;
}
const isDemoPayload=value=>JSON.stringify(snapshotData(value))===JSON.stringify(snapshotData(defaultData));
async function loadFromCloud(){
  cloudLoaded=false;
  // クラウド読込で上書きする前に、この端末に残る以前の保存内容を退避する。
  const localSnapshot=snapshotData(data);
  const localScore=dataScore(localSnapshot);
  const usableLocal=!isDemoPayload(localSnapshot)&&localScore>0;
  let result;
  try{
    result=await Promise.race([
      supabaseClient.from('store_data').select('payload').eq('user_id',cloudUser.id).maybeSingle(),
      new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),12000))
    ]);
  }catch(error){
    console.error('Cloud load failed',error);
    showAuthMessage('データ読込で通信エラーになりました。再度ログインしてください。');
    return false;
  }
  if(result?.timeout){
    showAuthMessage('データ読込に時間がかかっています。通信を確認して再度ログインしてください。');
    return false;
  }
  const {data:row,error}=result;
  if(error){showAuthMessage('データを読み込めませんでした。通信を確認して再度ログインしてください。');return false;}
  const rawPayload=row?.payload;
  const cloudSnapshot=rawPayload?normalizeData(rawPayload):null;
  const cloudScore=cloudSnapshot?dataScore(snapshotData(cloudSnapshot)):0;
  // 保存済みの世代バックアップから、現在よりキャスト情報が多い状態を探す。
  const recoveryCandidate=(Array.isArray(rawPayload?._backups)?rawPayload._backups:[])
    .map(item=>item?.payload?normalizeData(item.payload):null)
    .filter(Boolean)
    .sort((left,right)=>dataScore(snapshotData(right))-dataScore(snapshotData(left)))
    .find(item=>(item.casts?.length||0)>(cloudSnapshot?.casts?.length||0));
  // バックアップは保管のみ。起動時に自動復元すると、意図した削除まで元に戻るため復元は行わない。
  if(recoveryCandidate) console.info('Previous backup is available for manual recovery if needed.');
  // クラウドが空で、この端末に実データが残っている場合だけ端末側を正として復元する。
  if(usableLocal && cloudScore===0){
    data=normalizeData(localSnapshot);
    lastCloudScore=localScore;
    cloudLoaded=true;
    await saveToCloud();
    showAuthMessage('端末内の保存データから復元しました。');
    render();
    return true;
  }
  if(cloudSnapshot){
    data=cloudSnapshot;
    lastCloudScore=cloudScore;
    localStorage.setItem(storageKey,JSON.stringify(data));
    archiveLocalSnapshot(data);
  }else{
    lastCloudScore=0;
    showAuthMessage('クラウドの保存データが見つかりません。データ保護のため保存は行われません。');
  }
  cloudLoaded=true;
  render();
  return true;
}
const castName = id => data.casts.find(x=>x.id===id)?.name || '退職キャスト';
const sortedCasts = () => data.casts.slice().sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'ja'));
const dateJP = d => { const value=String(d||'').trim(); const parsed=value?new Date(value.replace(/\//g,'-')+'T12:00:00'):null; return parsed&&!Number.isNaN(parsed.valueOf())?parsed.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'}):''; };
const isSelectedMonth = date => String(date||'').startsWith(data.month+'-');
const expenseAccountingMonth = expense => String(expense?.accountingMonth||expense?.date||'').slice(0,7);
const expensePostingDate = expense => {
  const month=expenseAccountingMonth(expense),day=Number(String(expense?.date||'').slice(8,10)||1);
  if(!month)return '';
  const [year,monthNumber]=month.split('-').map(Number),lastDay=new Date(year,monthNumber,0).getDate();
  return month+'-'+String(Math.min(Math.max(day,1),lastDay)).padStart(2,'0');
};
const monthLabel = () => { const [year,month]=data.month.split('-').map(Number); return year+'年 '+month+'月'; };
const dateKey=value=>{const raw=String(value||'').trim().replace(/\//g,'-');const match=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);return match?match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0'):raw;};
const todayKey=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
const effectiveCastStatus=cast=>{const leaving=dateKey(cast.leavingDate);if(leaving&&leaving<=todayKey())return '退店';if(leaving&&cast.status==='退店')return '在籍';return cast.status||'在籍';};
const dailyBackKeys=['free1000','free1500','free2000','free2500','free3000','main1000','main1500','main2000','main2500','main3000','mainP','mainDecoration','companion1000','companion1500','companion2000','companion2500','companion3000','companionP','companionDecoration'];

// 個別保証: 入力された項目だけ全体設定より優先し、終了日が空欄なら無期で適用します。
const guaranteeSettingKeys=['mainNomination','companion','extension','freeDrinkRate','mainDrinkRate','mainDecoration','mainBottle','mainChampagne','companionDrinkRate','companionDecoration','companionBottle','companionChampagne','consumptionTax','taxRate','welfarePerShift','deductionPerShift','monthlyMainCompanionStep','monthlyMainCompanionAdd','monthlyCompanionStep','monthlyCompanionAdd','monthlySalesStep','monthlySalesAdd'];
function activeCastGuarantee(cast,date){
  const g=cast?.guarantee;
  if(!g||!Object.keys(g).some(key=>!['startDate','endDate'].includes(key)&&g[key]!==''&&g[key]!==undefined))return null;
  const d=date||'';
  if(g.startDate&&d<g.startDate)return null;
  if(g.endDate&&d>g.endDate)return null;
  return g;
}
function castSettings(cast,date){
  const guarantee=activeCastGuarantee(cast,date);
  if(!guarantee)return data.settings;
  const settings={...data.settings};
  guaranteeSettingKeys.forEach(key=>{if(guarantee[key]!==''&&guarantee[key]!==undefined)settings[key]=Number(guarantee[key]);});
  return settings;
}
function castHourly(cast,date){
  const guarantee=activeCastGuarantee(cast,date);
  return guarantee&&guarantee.hourly!==''&&guarantee.hourly!==undefined?Number(guarantee.hourly):Number(cast?.hourly||0);
}
const guaranteeLabels={mainNomination:'本指名（1本）',companion:'同伴（1本）',extension:'延長（1本）',freeDrinkRate:'ドリンクバック（%）',mainDrinkRate:'ドリンクバック（%）',mainDecoration:'飾り物',mainBottle:'ボトル・シャンパン（%）',companionDrinkRate:'ドリンクバック（%）',companionDecoration:'飾り物',companionBottle:'ボトル・シャンパン（%）',consumptionTax:'消費税（%）',taxRate:'所得税（%）',welfarePerShift:'厚生費（1出勤につき）',monthlyMainCompanionStep:'本指名・同伴の合計本数',monthlyMainCompanionAdd:'時給加算',monthlyCompanionStep:'同伴の本数',monthlyCompanionAdd:'時給加算',monthlySalesStep:'売上',monthlySalesAdd:'時給加算'};
function guaranteeInput(key,label=guaranteeLabels[key]){return '<label class="field guarantee-field">'+label+'<input name="guarantee_'+key+'" type="number" inputmode="decimal" min="0" placeholder=""></label>';}
function guaranteeGroup(title,keys){return '<section class="guarantee-setting-group"><h4>'+title+'</h4><div class="guarantee-grid">'+keys.map(key=>guaranteeInput(key)).join('')+'</div></section>';}
function guaranteeRule(text,stepKey,unit,addKey){return '<div class="guarantee-rule"><span>'+text+'</span><input name="guarantee_'+stepKey+'" type="number" inputmode="decimal" min="0" aria-label="'+guaranteeLabels[stepKey]+'"><span>'+unit+'毎に＋</span><input name="guarantee_'+addKey+'" type="number" inputmode="decimal" min="0" aria-label="'+guaranteeLabels[addKey]+'"><span>円</span></div>';}
function guaranteeProfileFields(){
  const groups=guaranteeGroup('指名バック',['mainNomination','companion','extension'])+guaranteeGroup('フリー',['freeDrinkRate'])+guaranteeGroup('本指名',['mainDrinkRate','mainBottle','mainDecoration'])+guaranteeGroup('同伴',['companionDrinkRate','companionBottle','companionDecoration'])+guaranteeGroup('控除',['consumptionTax','taxRate','welfarePerShift'])+'<section class="guarantee-setting-group guarantee-hourly-system"><h4>女子給システム</h4>'+guaranteeRule('月毎で本指名・同伴の合計本数が','monthlyMainCompanionStep','本','monthlyMainCompanionAdd')+guaranteeRule('月毎で同伴の本数が','monthlyCompanionStep','本','monthlyCompanionAdd')+guaranteeRule('月毎の売上が','monthlySalesStep','円','monthlySalesAdd')+'</section>';
  const legacyValues=['deductionPerShift','mainChampagne','companionChampagne'].map(key=>'<input class="guarantee-hidden-value" name="guarantee_'+key+'" type="hidden">').join('');
  return '<section class="cast-guarantee full"><h3>個別保証設定</h3><p>入力した項目だけ全体設定より優先します。終了日が空欄なら無期です。</p><details class="guarantee-details"><summary>保証を設定</summary><div class="guarantee-period"><label class="field">開始日<input name="guarantee_startDate" type="date"></label><label class="field">終了日（空欄で無期）<input name="guarantee_endDate" type="date"></label><label class="field">保証時給<input name="guarantee_hourly" type="number" inputmode="numeric" min="0" placeholder="全体時給を使用"></label></div><div class="guarantee-groups">'+groups+legacyValues+'</div></details></section>';
}

function dailyBackBreakdown(input,settings=data.settings){
  const detailBack=keys=>keys.reduce((sum,key)=>sum+Number(input[key]||0)*Number(settings[key]||0),0);
  const companionBack=Number(input.companionCount||0)*Number(settings.companion||0);
  const mainBack=Number(input.mainCount||0)*Number(settings.mainNomination||0);
  const extensionBack=(Number(input.mainExtension||0)+Number(input.companionExtension||0))*Number(settings.extension||0);
  const freeKeys=['free1000','free1500','free2000','free2500','free3000'];
  const freeSales=freeKeys.reduce((sum,key)=>sum+Number(input[key]||0)*Number(key.replace('free','')||0),0);
  const freeDrinkBack=settings.freeDrinkRate!==undefined&&settings.freeDrinkRate!==''?Math.round(freeSales*Number(settings.freeDrinkRate||0)/100):detailBack(freeKeys);
  const mainDrinkKeys=['main1000','main1500','main2000','main2500','main3000','mainP'];
  const companionDrinkKeys=['companion1000','companion1500','companion2000','companion2500','companion3000','companionP'];
  const drinkSales=keys=>keys.reduce((sum,key)=>sum+Number(input[key]||0)*(Number(key.match(/\d+/)?.[0]||0)),0);
  const mainDrinkBack=settings.mainDrinkRate!==undefined&&settings.mainDrinkRate!==''?Math.round(drinkSales(mainDrinkKeys)*Number(settings.mainDrinkRate||0)/100):detailBack(mainDrinkKeys);
  const companionDrinkBack=settings.companionDrinkRate!==undefined&&settings.companionDrinkRate!==''?Math.round(drinkSales(companionDrinkKeys)*Number(settings.companionDrinkRate||0)/100):detailBack(companionDrinkKeys);
  const drink=freeDrinkBack+mainDrinkBack+companionDrinkBack;
  const decoration=detailBack(['mainDecoration','companionDecoration']);
  const bottleChampagne=(Number(input.mainBottle||0)+Number(input.mainChampagne||0))*Number(settings.mainBottle||0)/100
    +(Number(input.companionBottle||0)+Number(input.companionChampagne||0))*Number(settings.companionBottle||0)/100;
  return {companionBack,mainBack,extensionBack,drink,decoration,bottleChampagne,backTotal:companionBack+mainBack+extensionBack+drink+decoration+bottleChampagne};
}
function monthlyHourlyBonus(values,settings=data.settings){
  const count=Number(values.main||0)+Number(values.companion||0);
  const companion=Number(values.companion||0);
  const sales=Number(values.nominated||0);
  const step=(key)=>Number(settings[key]||0);
  const earned=(value,stepKey,addKey)=>step(stepKey)>0?Math.floor(value/step(stepKey))*step(addKey):0;
  return earned(count,'monthlyMainCompanionStep','monthlyMainCompanionAdd')
    +earned(companion,'monthlyCompanionStep','monthlyCompanionAdd')
    +earned(sales,'monthlySalesStep','monthlySalesAdd');
}
function calcDailyInput(input){
  const cast=data.casts.find(c=>c.id===input.castId);
  const settings=castSettings(cast,input.date);
  const hours=Number(input.hours||0);
  const hourly=hours*castHourly(cast,input.date);
  const backBreakdown=dailyBackBreakdown(input,settings);
  const back=backBreakdown.backTotal;
  const allowance=Number(input.allowance||0);
  const gross=hourly+back+allowance;
  const consumption=Math.round(gross*Number(settings.consumptionTax||0)/100);
  const income=Math.round(Math.max(0,gross-consumption)*Number(settings.taxRate||0)/100);
  const worked=hours>0;
  const welfare=worked?Number(settings.welfarePerShift||0):0;
  const baseDeduction=worked?Number(settings.deductionPerShift||0):0;
  const deduction=Number(input.deduction||0);
  const deductions=income+consumption+welfare+baseDeduction+deduction;
  const advance=Number(input.advance||0);
  return {hours,advance,back,allowance,hourly,gross,deductions,incomeTax:income,consumptionTax:consumption,welfare,baseDeduction,deduction,payout:Math.max(0,gross-deductions-advance),...backBreakdown};
}
function payrollAdjustment(castId){return (data.payrollAdjustments||[]).find(item=>item.castId===castId&&item.month===data.month)||{};}
function applyPayrollAdjustment(castId,values){
  const adjustment=payrollAdjustment(castId);
  const value=(key,fallback)=>adjustment[key]!==undefined&&adjustment[key]!==''?Number(adjustment[key]):Number(fallback||0);
  const nominated=value('nominated',values.nominated),area=value('area',values.area),main=value('main',values.main),companion=value('companion',values.companion),hours=value('hours',values.hours),hourly=value('hourly',values.hourly),back=value('back',values.back),allowance=value('allowance',values.allowance);
  const gross=hourly+back+allowance;
  const consumptionTax=Math.round(gross*Number(data.settings.consumptionTax||0)/100);
  const incomeTax=Math.round(Math.max(0,gross-consumptionTax)*Number(data.settings.taxRate||0)/100);
  const autoDeductions=Number(values.deductions||0)-Number(values.incomeTax||0)-Number(values.consumptionTax||0)+consumptionTax+incomeTax+Number(values.advance||0);
  const deductions=value('deductions',autoDeductions);
  const payout=value('payout',Math.max(0,gross-deductions));
  return {...values,nominated,area,main,companion,hours,hourly,back,allowance,deductions,advance:0,payout,consumptionTax,incomeTax};
}
function enrichCastPayroll(castId,raw){
  const result=applyPayrollAdjustment(castId,raw);
  const adjustment=payrollAdjustment(castId);
  const manualDeductions=adjustment.deductions!==undefined&&adjustment.deductions!=='';
  const gross=Number(result.hourly||0)+Number(result.back||0)+Number(result.allowance||0);
  const advanceAmount=manualDeductions?0:Number(raw.advanceAmount||0);
  const deductionTotal=manualDeductions?Math.max(0,Number(result.deductions||0)-advanceAmount):Math.max(0,Number(result.deductions||0)-advanceAmount);
  return {...raw,...result,gross,deductionTotal,advanceAmount,payoutBeforeAdvance:Math.max(0,gross-deductionTotal)};
}
function calcCast(cast){
  const dailyInputs=data.dailyInputs.filter(x=>x.castId===cast.id&&isSelectedMonth(x.date));
  if(dailyInputs.length){
    const values=dailyInputs.map(calcDailyInput);
    const sum=key=>values.reduce((n,x)=>n+Number(x[key]||0),0);
    const inputSum=key=>dailyInputs.reduce((n,x)=>n+Number(x[key]||0),0);
    // 出勤日数・出勤ごとの控除は、実働時間がある日だけを対象にします。
    const days=values.filter(value=>Number(value.hours||0)>0).length,hours=sum('hours'),advance=sum('advance');
    const nominated=inputSum('mainSales'),area=inputSum('areaNomination'),main=inputSum('mainCount'),companion=inputSum('companionCount');
    const payrollSettings=castSettings(cast,dailyInputs[dailyInputs.length-1]?.date||data.month+'-01');
    const hourlyBonus=monthlyHourlyBonus({main,companion,nominated},payrollSettings);
    const hourly=sum('hourly')+hours*hourlyBonus;
    const companionBack=sum('companionBack'),mainBack=sum('mainBack'),extensionBack=sum('extensionBack'),drink=sum('drink'),decoration=sum('decoration'),bottleChampagne=sum('bottleChampagne'),backTotal=sum('backTotal'),allowance=sum('allowance');
    const back=backTotal,gross=hourly+back+allowance;
    const bonusGross=hours*hourlyBonus;
    const consumptionTax=sum('consumptionTax')+Math.round(bonusGross*Number(payrollSettings.consumptionTax||0)/100);
    const incomeTax=sum('incomeTax')+Math.round(Math.max(0,bonusGross-Math.round(bonusGross*Number(payrollSettings.consumptionTax||0)/100))*Number(payrollSettings.taxRate||0)/100);
    const welfare=sum('welfare');
    const pull=inputSum('deduction')+sum('baseDeduction');
    const deductionTotal=incomeTax+consumptionTax+welfare+pull;
    return enrichCastPayroll(cast.id,{days,hours,advance,advanceAmount:advance,nominated,area,main,companion,extension:inputSum('mainExtension')+inputSum('companionExtension'),hourlyBonus,companionBack,mainBack,extensionBack,drink,decoration,bottleChampagne,allowance,backTotal,back,hourly,gross,consumptionTax,incomeTax,welfare,pull,deductionTotal,deductions:deductionTotal,payout:Math.max(0,gross-deductionTotal-advance)});
  }
  const slips=data.slips.filter(s=>isSelectedMonth(slipSalesPostingDate(s))&&!isUnsettledSlip(s)).flatMap(s=>(s.casts||[]).map(a=>({...a,date:slipSalesPostingDate(s)}))).filter(a=>a.castId===cast.id);
  const shifts=data.shifts.filter(x=>x.castId===cast.id&&isSelectedMonth(x.date));
  const hours=shifts.reduce((n,x)=>n+Number(x.hours||0),0),advance=shifts.reduce((n,x)=>n+Number(x.advance||0),0);
  const nominated=slips.filter(x=>x.type==='本指名').reduce((n,x)=>n+Number(x.sales||0),0);
  const area=slips.filter(x=>x.type==='場内'||x.type==='フリー・場内').length,main=slips.filter(x=>x.type==='本指名').length,companion=slips.filter(x=>x.type==='同伴').length;
  const drink=slips.reduce((n,x)=>n+Number(x.drink||0),0),bottle=slips.reduce((n,x)=>n+Number(x.bottle||0),0),champagne=slips.reduce((n,x)=>n+Number(x.champagne||0),0),extension=slips.reduce((n,x)=>n+Number(x.extension||0),0);
  const companionBack=companion*Number(data.settings.companion||0),mainBack=main*Number(data.settings.mainNomination||0),extensionBack=extension*Number(data.settings.extension||0),drinkBack=drink*Number(data.settings.drink||0),bottleChampagneBack=bottle*Number(data.settings.bottle||0)+champagne*Number(data.settings.champagne||0),backTotal=companionBack+mainBack+extensionBack+drinkBack+bottleChampagneBack;
  const back=backTotal,hourlyBonus=monthlyHourlyBonus({main,companion,nominated}),hourly=hours*(Number(cast.hourly||0)+hourlyBonus),gross=hourly+back,consumptionTax=Math.round(gross*Number(data.settings.consumptionTax||0)/100),incomeTax=Math.round(Math.max(0,gross-consumptionTax)*Number(data.settings.taxRate||0)/100),welfare=shifts.length*Number(data.settings.welfarePerShift||0),pull=shifts.reduce((n,x)=>n+Number(x.deduction||0),0)+shifts.length*Number(data.settings.deductionPerShift||0),deductionTotal=incomeTax+consumptionTax+welfare+pull;
  return enrichCastPayroll(cast.id,{days:shifts.length,hours,advance,advanceAmount:advance,nominated,area,main,companion,extension,hourlyBonus,companionBack,mainBack,extensionBack,drink:drinkBack,decoration:0,bottleChampagne:bottleChampagneBack,allowance:0,backTotal,back,hourly,gross,consumptionTax,incomeTax,welfare,pull,deductionTotal,deductions:deductionTotal,payout:Math.max(0,gross-deductionTotal-advance)});
}
function totals(){const sales=data.slips.filter(x=>isSelectedMonth(slipSalesPostingDate(x))&&!isUnsettledSlip(x)).reduce((n,x)=>n+Number(x.total),0);const expense=data.expenses.filter(x=>expenseAccountingMonth(x)===data.month).reduce((n,x)=>n+Number(x.amount),0);const payroll=data.casts.reduce((n,c)=>n+calcCast(c).payout,0);return {sales,expense,payroll,balance:sales-expense-payroll};}
function updateMonthUi(){ $('#monthButton').value=data.month;if($('#dashboard').classList.contains('active'))$('#pageTitle').textContent=monthLabel(); }
function render(){
  const renderTasks=[
    ['月選択',updateMonthUi],['ダッシュボード',renderDashboard],['未収伝票',renderUnsettledSlips],
    ['伝票一覧',renderSlips],['日別伝票',renderDailySlips],['日別打込み',renderDailyInputs],
    ['女子給',renderCasts],['キャスト管理',renderCastManagement],['応募',renderApplications],
    ['シフト',renderShifts],['支出',renderExpenses],['計算設定',renderSettings]
  ];
  renderTasks.forEach(([name,task])=>{try{task();}catch(error){console.error('画面描画エラー: '+name,error);}});
  markNegativeAmounts();
}
function dailyRows(){
  const [year,month]=data.month.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  const weekdays=['日','月','火','水','木','金','土'];
  return Array.from({length:count},(_,i)=>{
    const date=data.month+'-'+String(i+1).padStart(2,'0');
    const daySlips=data.slips.filter(x=>slipSalesPostingDate(x)===date),slips=daySlips.filter(x=>!isUnsettledSlip(x)),unsettledSlips=daySlips.filter(isUnsettledSlip),shifts=data.shifts.filter(x=>x.date===date), dailyInputs=data.dailyInputs.filter(x=>x.date===date), manualExpense=data.dailyLedgerExpenses.filter(x=>x.date===date).reduce((sum,item)=>sum+Number(item.amount||0),0),manualSalesEntry=data.dailyLedgerSales.find(item=>item.date===date),manualSalesEntered=Boolean(manualSalesEntry),manualSales=Number(manualSalesEntry?.amount||0),manualAdvanceEntry=data.dailyLedgerAdvances.find(item=>item.date===date),manualAdvanceEntered=Boolean(manualAdvanceEntry),manualAdvance=Number(manualAdvanceEntry?.amount||0);
    const slipSales=slips.reduce((n,x)=>n+Number(x.total||0),0),sales=slipSales+manualSales;
    const card=slips.reduce((n,x)=>n+Number(x.card||0),0);
    const receivable=slips.reduce((n,x)=>n+Number(x.receivable||0),0)+unsettledSlips.reduce((n,x)=>n+Number(x.total||0),0),unsettledPaid=unsettledSlips.reduce((sum,slip)=>sum+slipPaymentLines(slip).filter(line=>paymentMethodCategory(line.method)!=='receivable').reduce((lineSum,line)=>lineSum+Number(line.amount||0),0),0);
    const groups=slips.reduce((n,x)=>n+Number(x.groups||0),0);
    const guests=slips.reduce((n,x)=>n+Number(x.guests||0),0);
    const nominated=slips.reduce((n,x)=>n+(x.casts||[]).reduce((m,c)=>m+Number(c.sales||0),0),0);
    const expense=manualExpense;
    const legacyAdvance=shifts.reduce((n,x)=>n+Number(x.advance||0),0);
    const legacyHourly=shifts.reduce((n,x)=>n+Number(x.hours||0)*(data.casts.find(c=>c.id===x.castId)?.hourly||0),0);
    const legacyBack=slips.reduce((n,slip)=>n+(slip.casts||[]).reduce((m,item)=>m+(item.type==='本指名'?Number(data.settings.mainNomination||0):0)+(item.type==='同伴'?Number(data.settings.companion||0):0)+Number(item.extension||0)*Number(data.settings.extension||0)+Number(item.drink||0)*Number(data.settings.drink||0)+Number(item.bottle||0)*Number(data.settings.bottle||0)+Number(item.champagne||0)*Number(data.settings.champagne||0),0),0);
    const legacyGross=legacyHourly+legacyBack;
    const legacyDeductions=Math.round(legacyGross*(Number(data.settings.taxRate||0)+Number(data.settings.consumptionTax||0))/100)+shifts.length*Number(data.settings.welfarePerShift||0);
    const dailyValues=dailyInputs.map(calcDailyInput);
    const dailySum=key=>dailyValues.reduce((n,x)=>n+Number(x[key]||0),0);
    const autoAdvance=dailyInputs.length?dailySum('advance'):legacyAdvance,advance=autoAdvance+manualAdvance;
    const payroll=dailyInputs.length?dailySum('payout'):Math.max(0,legacyGross-legacyDeductions-legacyAdvance);
    const cash=Math.max(0,sales-card),status=data.dailyStatuses.find(item=>item.date===date)?.status||'営業';
    return {date,day:i+1,weekday:weekdays[new Date(date+'T12:00:00').getDay()],status,slipSales,manualSales,manualSalesEntered,autoAdvance,castAdvance:autoAdvance,manualAdvance,manualAdvanceEntered,sales,card,receivable,unsettledPaid,cash,groups,guests,nominated,expense,advance,payroll,cashBalance:cash+unsettledPaid-expense-advance};
  });
}
window.updateDailyLedgerExpense=(date,value)=>{const amount=Math.max(0,Number(value)||0),existing=data.dailyLedgerExpenses.find(item=>item.date===date);if(amount){if(existing)existing.amount=amount;else data.dailyLedgerExpenses.push({date,amount});}else data.dailyLedgerExpenses=data.dailyLedgerExpenses.filter(item=>item.date!==date);save();renderDashboard();};
window.updateDailyLedgerSales=(date,value)=>{const raw=String(value??'').trim(),existing=data.dailyLedgerSales.find(item=>item.date===date);if(raw===''){data.dailyLedgerSales=data.dailyLedgerSales.filter(item=>item.date!==date);}else{const amount=Math.max(0,Number(raw)||0);if(existing)existing.amount=amount;else data.dailyLedgerSales.push({date,amount});}save();renderDashboard();};
window.updateDailyLedgerAdvance=(date,value)=>{const raw=String(value??'').trim(),existing=data.dailyLedgerAdvances.find(item=>item.date===date);if(raw===''){data.dailyLedgerAdvances=data.dailyLedgerAdvances.filter(item=>item.date!==date);}else{const amount=Math.max(0,Number(raw)||0);if(existing)existing.amount=amount;else data.dailyLedgerAdvances.push({date,amount});}save();renderDashboard();};
function renderDashboard(){
  const t=totals(),slips=data.slips.filter(x=>isSelectedMonth(slipSalesPostingDate(x))&&!isUnsettledSlip(x)),expenses=data.expenses.filter(x=>expenseAccountingMonth(x)===data.month); $('#totalSales').textContent=yen(t.sales);$('#salesCount').textContent=`伝票 ${slips.length}件`;$('#totalBalance').textContent=yen(t.balance);$('#balanceRatio').textContent=`${t.sales?Math.round(t.balance/t.sales*100):0}%`;$('#totalExpenses').textContent=yen(t.expense);$('#expenseDetails').textContent=`経費 ${expenses.length}件`;$('#expenseRatio').textContent=`${t.sales?Math.round(t.expense/t.sales*100):0}%`;$('#totalPayroll').textContent=yen(t.payroll);$('#payrollRatio').textContent=`${t.sales?Math.round(t.payroll/t.sales*100):0}%`;$('#payrollDetails').textContent=`売上に対して ${t.sales?Math.round(t.payroll/t.sales*100):0}%`;
  const rows=dailyRows(),ledgerSales=rows.reduce((sum,row)=>sum+row.sales,0),activeRows=rows.filter(x=>x.sales||x.expense||x.receivable||x.manualSalesEntered);
  $('#dailyLedgerTotal').textContent=yen(ledgerSales);
  const guests=rows.reduce((n,x)=>n+x.guests,0), groups=rows.reduce((n,x)=>n+x.groups,0), activeDays=activeRows.length;
  $('#dailyKpis').innerHTML=[
    ['営業日数',`${activeDays}日`,''],
    ['平均売上',yen(activeDays?ledgerSales/activeDays:0),''],
    ['平均客単価',yen(guests?ledgerSales/guests:0),`来店 ${groups}組 / ${guests}名`],
    ['現金比率',`${ledgerSales?Math.round(rows.reduce((n,x)=>n+x.cash,0)/ledgerSales*100):0}%`,'現金売上 ÷ 総売上']
  ].map(([label,value,note])=>`<div class="daily-kpi"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
  $('#dailySalesTable').innerHTML=rows.map(x=>{
    const zeroSalesDay=x.manualSalesEntered&&x.manualSales===0&&x.slipSales===0;
    const hasActivity=x.sales||x.expense||x.receivable||x.advance||x.payroll||x.manualSalesEntered||x.manualAdvanceEntered;
    const amount=(n,showZero=false)=>n?yen(n):(showZero?'¥0':'—');
    return '<tr class="'+(hasActivity?'has-activity ':'')+(x.status==='店休'?'is-store-closed ':x.status==='キャスト0'?'is-cast-zero':'')+'"><td><b>'+x.day+'日</b>'+(x.status==='店休'?'<small class="store-closed-label">店休</small>':x.status==='キャスト0'?'<small class="cast-zero-label">キャスト0</small>':'')+'</td><td class="weekday">('+x.weekday+')</td><td class="amount sales"><span class="daily-money-input"><i>¥</i><input class="daily-sales-input" type="number" min="0" inputmode="numeric" aria-label="'+x.day+'日の売上手入力" value="'+(x.manualSalesEntered?x.manualSales:'')+'" placeholder="'+(x.slipSales?yen(x.slipSales).replace('¥',''):'—')+'" onchange="updateDailyLedgerSales(\''+x.date+'\',this.value)"></span></td><td class="amount">'+amount(x.cash,zeroSalesDay)+'</td><td class="amount">'+amount(x.card,zeroSalesDay)+'</td><td class="amount">'+amount(x.receivable,zeroSalesDay)+'</td><td>'+ (x.groups|| (zeroSalesDay?'0':'—'))+'</td><td>'+ (x.guests|| (zeroSalesDay?'0':'—'))+'</td><td class="amount">'+(x.guests?yen(x.sales/x.guests):'—')+'</td><td class="amount"><span class="daily-money-input"><i>¥</i><input class="daily-advance-input" type="number" min="0" inputmode="numeric" aria-label="'+x.day+'日の男子日払い手入力" value="'+(x.manualAdvanceEntered?x.manualAdvance:'')+'" placeholder="—" onchange="updateDailyLedgerAdvance(\''+x.date+'\',this.value)"></span></td><td class="amount cast-advance">'+amount(x.castAdvance)+'</td><td class="amount expense"><span class="daily-money-input"><i>¥</i><input class="daily-expense-input" type="number" min="0" inputmode="numeric" aria-label="'+x.day+'日の支出" value="'+(x.expense||'')+'" placeholder="—" onchange="updateDailyLedgerExpense(\''+x.date+'\',this.value)"></span></td><td class="amount balance">'+(hasActivity?yen(x.cashBalance):'—')+'</td><td class="amount">'+amount(x.payroll)+'</td><td>'+ (x.sales?Math.round(x.payroll/x.sales*100)+'%':'—')+'</td></tr>';
  }).join('');
}
function unsettledPaymentLabel(slip){
  const lines=slipPaymentLines(slip).filter(item=>item.amount>0);
  const receivableFromLines=lines.filter(item=>paymentMethodCategory(item.method)==='receivable').reduce((sum,item)=>sum+Number(item.amount||0),0);
  const receivable=Math.max(Number(slip?.receivable||0),receivableFromLines);
  const paid=lines.filter(item=>paymentMethodCategory(item.method)!=='receivable').reduce((sum,item)=>sum+Number(item.amount||0),0);
  return '未収残額 '+yen(receivable)+(paid>0?' / 入金分 '+yen(paid):'');
}
function slipTableRow(s){
  const unsettled=isUnsettledSlip(s),paymentLabel=unsettled?unsettledPaymentLabel(s):slipPaymentSummary(s);
  const slipIndex=data.slips.indexOf(s);
  const postedDate=slipSalesPostingDate(s),recovered=Boolean(s.receivedDate);
  const dateCell=dateJP(postedDate)+(recovered?'<small class="issued-slip-label">発行 '+dateJP(s.date)+'</small>':'');
  const slipIdCell=(s.id||'—')+(recovered?'<span class="recovered-slip-label">回収伝票</span>':'');
  return '<tr class="'+(unsettled?'unsettled-slip':'')+'"><td>'+dateCell+'</td><td>'+slipIdCell+'</td><td>'+ (s.customerName||'—')+'</td><td>'+ (s.guests? s.guests+'名':'—')+'</td><td>'+yen(s.total)+'</td><td>'+(s.receipt?'<input class="receipt-list-check" type="checkbox" checked tabindex="-1" onclick="return false" aria-label="領収証あり">':'')+'</td><td><span class="status '+(unsettled?'unsettled-status ':slipPaymentCashOnly(s)?'cash':'')+'">'+paymentLabel+'</span></td><td><button class="text-button" onclick="editSlip('+slipIndex+')">編集</button></td></tr>';
}
function renderUnsettledSlips(){
  const slips=data.slips.filter(isUnsettledSlip).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||''),'ja',{numeric:true}));
  $('#unsettledSlipSummary').textContent='未収あり '+slips.length+'件（すべての年度）';
  $('#unsettledSlipTable').innerHTML=slips.map(slipTableRow).join('')||empty(8,'未収伝票はありません');
}
function renderDailySlips(){
  const input=$('#slipDayFilter');
  const fallback=(data.month||todayKey().slice(0,7))+'-01';
  const selectedDate=dateKey((input&&input.value)||window.slipDayFilter||fallback);
  window.slipDayFilter=selectedDate;
  if(input){
    if(input.value!==selectedDate)input.value=selectedDate;
    const update=event=>{window.slipDayFilter=dateKey(event.target.value);renderDailySlips();};
    input.onchange=update;
    input.oninput=update;
  }
  const slips=(Array.isArray(data.slips)?data.slips:[])
    .filter(slip=>[slip.receivedDate,slip.date,slipSalesPostingDate(slip)].some(value=>dateKey(value)===selectedDate))
    .filter((slip,index,list)=>list.indexOf(slip)===index)
    .slice()
    .sort((a,b)=>String(a.id||'').localeCompare(String(b.id||''),'ja',{numeric:true}));
  const selectedDateLabel=dateJP(selectedDate);$('#dailySlipSummary').textContent=(selectedDateLabel?selectedDateLabel+'・':'')+slips.length+'件';
  $('#dailySlipTable').innerHTML=slips.length?slips.map(slipTableRow).join(''):empty(8,'この日の伝票はありません');
}
function renderSlips(){
  const direction=slipDateSort==='asc'?1:-1;
  $('#sortSlipsDate').textContent='日付 '+(slipDateSort==='asc'?'↑':'↓');
  const slips=data.slips.filter(x=>isSelectedMonth(slipSalesPostingDate(x)));
  $('#slipSummary').textContent=data.month.replace('-','年')+'月・'+slips.length+'件';
  $('#slipTable').innerHTML=slips.slice().sort((a,b)=>{const dateOrder=String(slipSalesPostingDate(a)||'').localeCompare(String(slipSalesPostingDate(b)||''))*direction;return dateOrder||String(a.id||'').localeCompare(String(b.id||''),'ja',{numeric:true})*direction;}).map(slipTableRow).join('')||empty(8,'伝票はまだありません');
}
function renderDailyInputs(){const [year,month]=data.month.split('-').map(Number),count=new Date(year,month,0).getDate(),grouped=new Map(),statuses=new Map(),inputs=data.dailyInputs.filter(x=>isSelectedMonth(x.date));inputs.forEach(x=>{if(!grouped.has(x.date))grouped.set(x.date,[]);grouped.get(x.date).push(x);});data.dailyStatuses.filter(x=>isSelectedMonth(x.date)).forEach(x=>statuses.set(x.date,x.status));const dates=Array.from({length:count},(_,i)=>data.month+'-'+String(i+1).padStart(2,'0')).sort((a,b)=>a.localeCompare(b)*(dailyInputDateSort==='asc'?1:-1));$('#dailyInputSummary').textContent=data.month.replace('-','年')+'月・'+inputs.length+'件';$('#sortDailyInputDate').textContent='日付 '+(dailyInputDateSort==='asc'?'↑':'↓');const options=status=>['営業','店休','キャスト0'].map(value=>'<option'+(status===value?' selected':'')+'>'+value+'</option>').join('');$('#dailyInputTable').innerHTML=dates.map(date=>{const entries=grouped.get(date)||[],status=statuses.get(date)||'営業',statusClass=status==='店休'?' is-closed':status==='キャスト0'?' is-zero':'';return '<tr><td><b>'+dateJP(date)+'</b></td><td><select class="daily-status-select'+statusClass+'" onchange="updateDailyStatus(\''+date+'\',this.value)">'+options(status)+'</select></td><td>'+entries.length+'人分</td><td><button class="primary-button compact-button" onclick="openDailyDateDetails(\''+date+'\')">詳細を見る</button></td></tr>';}).join('');}
function renderCasts(){
  const value=(amount,suffix='')=>Number(amount||0)?yen(amount)+suffix:'—';
  const count=(amount,label='')=>Number(amount||0)?Number(amount)+label:'—';
  // 退店月以降は給与の支給一覧に表示しない（退店前の月だけ確認できます）。
  const visibleInPayroll=cast=>{
    const leavingMonth=dateKey(cast.leavingDate).slice(0,7);
    // 退店日を含む月までは給与一覧に表示します（例：7/31退店なら7月は表示）。
    const activeForMonth=leavingMonth?String(data.month||'')<=leavingMonth:effectiveCastStatus(cast)!=='退店';
    if(!activeForMonth)return false;
    // 非表示キャストは、その月に実際の支給額がある場合だけ給与一覧に残します。
    return !cast.hidden||Number(calcCast(cast).payout||0)>0;
  };
  $('#castTable').innerHTML=sortedCasts().filter(visibleInPayroll).map(c=>{
    const x=calcCast(c),payRate=x.nominated?Math.round(Number(x.payout||0)/Number(x.nominated||1)*100)+'%':'—',averageHourly=x.hours?yen(Number(x.gross||0)/Number(x.hours||1)):'—';
    return '<tr><td><button type="button" class="payroll-cast-link" onclick="openForm(\'payrollDetails\',\''+c.id+'\')"><b>'+c.name+'</b><small>時給 '+yen(Number(c.hourly||0)+Number(x.hourlyBonus||0))+'</small></button></td><td>'+value(x.nominated)+'</td><td>'+count(x.area,'本')+' / '+count(x.main,'本')+' / '+count(x.companion,'本')+' / '+count(x.extension,'本')+'</td><td>'+count(x.days,'日')+'</td><td>'+Number(x.hours||0).toFixed(1)+'h</td><td>'+value(x.hourly)+'</td><td>'+value(x.companionBack)+'</td><td>'+value(x.mainBack)+'</td><td>'+value(x.extensionBack)+'</td><td>'+value(x.drink)+'</td><td>'+value(x.decoration)+'</td><td>'+value(x.bottleChampagne)+'</td><td>'+value(x.allowance)+'</td><td>'+value(Number(x.back||0)+Number(x.allowance||0))+'</td><td>'+value(x.consumptionTax)+'</td><td>'+value(x.incomeTax)+'</td><td>'+value(x.welfare)+'</td><td>'+value(x.pull)+'</td><td>'+value(x.deductionTotal)+'</td><td>'+value(x.advanceAmount)+'</td><td>'+value(x.gross)+'</td><td>'+value(x.payoutBeforeAdvance)+'</td><td><b>'+value(x.payout)+'</b></td><td>'+payRate+'</td><td>'+averageHourly+'</td><td><button class="text-button" onclick="editCastPayroll(\''+c.id+'\')">詳細・編集</button></td></tr>';
  }).join('')||empty(26,'キャストはまだいません');
}
const castAge=birthday=>{if(!birthday)return '—';const birth=new Date(birthday+'T00:00:00'),today=new Date();let years=today.getFullYear()-birth.getFullYear();if(today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate()))years--;return years+'歳';};
function renderCastManagement(){
  const row=(c,showLeavingDate=false,showAddress=false)=>{const profileAge=(c.age!==''&&c.age!==undefined&&c.age!==null)?String(c.age)+'歳':castAge(c.birthday);const checked=[c.termsSigned,c.photoSubmitted,c.residenceCertificate].filter(Boolean).length;const checkLabel=checked===3?'確認済':'未確認 '+checked+'/3';const address=[c.address,c.building].filter(Boolean).join(' ')||'—';const memo='<td>'+(c.memo||'—')+'</td>';const addressCells='<td><button class="text-button" onclick="copyCastAddress(&quot;'+c.id+'&quot;)">コピー</button></td><td>'+address+'</td>';const actions='<td class="cast-action-cell"><button class="text-button" onclick="editCastProfile(&quot;'+c.id+'&quot;)">編集・詳細</button></td>';return '<tr><td><b>'+c.name+'</b></td><td>'+profileAge+'</td><td><span class="cast-check-status '+(checked===3?'complete':'incomplete')+'">'+checkLabel+'</span></td>'+(showLeavingDate?'<td>'+(c.leavingDate?dateKey(c.leavingDate).replace(/-/g,'/'):'—')+'</td>':'')+(showAddress?addressCells+memo:memo)+actions+'</tr>';};
  const hiddenRow=c=>'<tr><td><b>'+c.name+'</b></td><td>'+effectiveCastStatus(c)+'</td><td>'+((c.age!==''&&c.age!==undefined&&c.age!==null)?String(c.age)+'歳':castAge(c.birthday))+'</td><td>'+(c.memo||'—')+'</td><td class="cast-action-cell"><button class="text-button" onclick="editCastProfile(&quot;'+c.id+'&quot;)">編集・詳細</button></td></tr>';
  const casts=sortedCasts(),hidden=casts.filter(c=>c.hidden),active=casts.filter(c=>!c.hidden&&!c.hidden&&effectiveCastStatus(c)!=='退店'),retired=casts.filter(c=>!c.hidden&&effectiveCastStatus(c)==='退店');
  $('#castManagementActiveTable').innerHTML=active.map(c=>row(c,false,true)).join('')||empty(7,'在籍キャストはいません');
  $('#castManagementRetiredTable').innerHTML=retired.map(c=>row(c,true)).join('')||empty(6,'退店キャストはいません');
  $('#castManagementHiddenTable').innerHTML=hidden.map(hiddenRow).join('')||empty(5,'非表示のキャストはいません');
}
window.toggleCastVisibility=id=>{const cast=data.casts.find(c=>c.id===id);if(!cast)return;cast.hidden=!cast.hidden;save();render();};
window.toggleEditingCastVisibility=()=>{if(!editingCastId)return;const cast=data.casts.find(c=>c.id===editingCastId);if(!cast)return;cast.hidden=!cast.hidden;save();render();closeEntryDialog();};
window.selectCastListTab=tab=>{document.querySelectorAll('.cast-list-tab').forEach(button=>{const active=button.dataset.castListTab===tab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});document.querySelectorAll('[data-cast-list-panel]').forEach(panel=>{const active=panel.dataset.castListPanel===tab;panel.hidden=!active;panel.classList.toggle('active',active);});const addCastButton=$('#addCastProfile');if(addCastButton){const show=tab==='active'||tab==='applications';addCastButton.hidden=!show;if(tab==='active'){addCastButton.textContent='＋ キャスト新規登録';addCastButton.onclick=()=>openForm('cast');}else if(tab==='applications'){addCastButton.textContent='＋ 応募を追加';addCastButton.onclick=()=>openForm('application');}}};

function renderApplications(){
  const fullDate=value=>value?dateKey(value).replace(/-/g,'/'):'—';
  const currentYear=String(new Date().getFullYear());
  const years=[...new Set([currentYear,...data.applications.map(item=>String(item.applicationDate||'').slice(0,4)).filter(year=>/^\d{4}$/.test(year))])].sort((a,b)=>Number(b)-Number(a));
  if(!window.applicationYearFilter||!years.includes(window.applicationYearFilter))window.applicationYearFilter=currentYear;
  if(!window.applicationStatsYearFilter||!years.includes(window.applicationStatsYearFilter))window.applicationStatsYearFilter=currentYear;
  if(!window.applicationStatsMonthFilter)window.applicationStatsMonthFilter='all';
  const selector=$('#applicationYearFilter');
  if(selector){selector.innerHTML='<option value="all">すべて</option>'+years.map(year=>'<option value="'+year+'">'+year+'年</option>').join('');selector.value=window.applicationYearFilter;}
  const statsYear=$('#applicationStatsYear');
  const statsMonth=$('#applicationStatsMonth');
  if(statsYear){statsYear.innerHTML='<option value="all">すべて</option>'+years.map(year=>'<option value="'+year+'">'+year+'年</option>').join('');statsYear.value=window.applicationStatsYearFilter;}
  if(statsMonth){statsMonth.innerHTML='<option value="all">すべての月</option>'+Array.from({length:12},(_,index)=>'<option value="'+String(index+1).padStart(2,'0')+'">'+(index+1)+'月</option>').join('');statsMonth.value=window.applicationStatsMonthFilter;}
  const selected=data.applications.filter(item=>{
    const date=String(item.applicationDate||'');
    return (window.applicationStatsYearFilter==='all'||date.slice(0,4)===window.applicationStatsYearFilter)&&(window.applicationStatsMonthFilter==='all'||date.slice(5,7)===window.applicationStatsMonthFilter);
  });
  const mediaCounts=selected.reduce((counts,item)=>{const media=item.media||'未設定';counts[media]=(counts[media]||0)+1;return counts;},{});
  const mediaRows=Object.entries(mediaCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ja')).map(([media,count])=>'<div class="application-media-stat"><span>'+media+'</span><strong>'+count+'件</strong></div>').join('');
  $('#applicationStatsTotal').textContent='応募合計 '+selected.length+'件';
  $('#applicationMediaStats').innerHTML=mediaRows||'<p class="application-stats-empty">この期間の応募はありません</p>';
  const rows=data.applications.filter(item=>window.applicationYearFilter==='all'||String(item.applicationDate||'').slice(0,4)===window.applicationYearFilter).slice().sort((a,b)=>String(b.applicationDate||'').localeCompare(String(a.applicationDate||''))).map(item=>'<tr><td><button class="text-button" onclick="editApplication(\''+item.id+'\')">編集</button></td><td>'+fullDate(item.applicationDate)+'</td><td><span class="application-status '+(item.status==='面接待ち'?'is-interview-waiting':item.status==='入店'?'is-joined':'')+'">'+(item.status||'—')+'</span></td><td>'+(item.recruitmentName||'—')+'</td><td>'+((item.age!==undefined&&item.age!==null&&item.age!=='')?item.age+'歳':castAge(item.birthday))+'</td><td>'+(item.media||'—')+'</td><td>'+fullDate(item.preferredInterviewDate)+'</td><td>'+fullDate(item.confirmedInterviewDate)+'</td><td>'+(item.interviewTime||'—')+'</td><td>'+(item.reschedule||'—')+'</td><td>'+(item.note||'—')+'</td></tr>').join('');
  $('#applicationsTable').innerHTML=rows||empty(11,'この年度の応募情報はありません');
}
window.setApplicationYearFilter=value=>{window.applicationYearFilter=value;renderApplications();};
window.setApplicationStatsFilter=(type,value)=>{if(type==='year')window.applicationStatsYearFilter=value;else window.applicationStatsMonthFilter=value;renderApplications();};
window.openApplicationForm=()=>openForm('application');window.editApplication=id=>openForm('application',id);

window.copyCastAddress=async id=>{const cast=data.casts.find(c=>c.id===id);const address=cast?.address||'';if(!address)return;try{await navigator.clipboard.writeText(address);alert('住所をコピーしました。');}catch(_error){const area=document.createElement('textarea');area.value=address;document.body.append(area);area.select();document.execCommand('copy');area.remove();alert('住所をコピーしました。');}};
window.editCastProfile=id=>openForm('cast',id);window.editCastPayroll=id=>openForm('payroll',id);window.updateDailyStatus=(date,status)=>{const item=data.dailyStatuses.find(x=>x.date===date);if(item)item.status=status;else data.dailyStatuses.push({date,status});save();renderDailyInputs();};window.editDailyInput=id=>{if(dialog.open)closeEntryDialog();openForm('dailyInput',id);};window.openDailyDateDetails=date=>openForm('dailyDetails',date);window.addDailyCastForDate=date=>{if(dialog.open)closeEntryDialog();openForm('dailyBatch',date);};
function renderShifts(){
  const [year,month]=data.month.split('-').map(Number);
  const count=new Date(year,month,0).getDate();
  const weekdays=['日','月','火','水','木','金','土'];
  const holidays={'2026-01-01':'元日','2026-01-12':'成人の日','2026-02-11':'建国記念の日','2026-02-23':'天皇誕生日','2026-03-20':'春分の日','2026-04-29':'昭和の日','2026-05-03':'憲法記念日','2026-05-04':'みどりの日','2026-05-05':'こどもの日','2026-05-06':'振替休日','2026-07-20':'海の日','2026-08-11':'山の日','2026-09-21':'敬老の日','2026-09-22':'国民の休日','2026-09-23':'秋分の日','2026-10-12':'スポーツの日','2026-11-03':'文化の日','2026-11-23':'勤労感謝の日'};
  const days=Array.from({length:count},(_,i)=>{const day=i+1,date=data.month+'-'+String(day).padStart(2,'0'),weekdayIndex=new Date(date+'T12:00:00').getDay();return {day,date,monthDay:month+'/'+day,weekday:weekdays[weekdayIndex],weekdayIndex,holiday:holidays[date]||'',shopClosed:data.dailyStatuses.some(item=>item.date===date&&item.status==='店休')};});
  const isExcludedShift=value=>/[×✕☓]/.test(String(value||''))||String(value||'').includes('当欠')||String(value||'').includes('無欠')||String(value||'').includes('休');
  const employmentDate=value=>String(value||'').replace(/\//g,'-');
  const isEmployedOn=(cast,date)=>{const joined=employmentDate(cast.joinedDate),leaving=employmentDate(cast.leavingDate);return (!joined||joined<=date)&&(!leaving||leaving>=date);};
  const visibleCasts=sortedCasts().filter(c=>!c.hidden&&days.some(day=>isEmployedOn(c,day.date)));
  $('#shiftMonthTitle').textContent=year+'年 '+month+'月 シフト表';$('.shift-table').style.setProperty('--shift-days',count);
  $('#shiftTableHead').innerHTML='<tr><th class="shift-name-head">キャスト</th>'+days.map(d=>'<th data-shift-date="'+d.date+'" class="shift-day-head '+(d.shopClosed?'shop-closed ':([5,6].includes(d.weekdayIndex)?'friday-saturday ':''))+'">'+d.day+'<small>('+d.weekday+')</small>'+(d.holiday?'<em>'+d.holiday+'</em>':'')+'</th>').join('')+'</tr>';
  const counts='<tr class="shift-count-row"><th>出勤</th>'+days.map(d=>{const castCount=data.shifts.filter(x=>{const cast=data.casts.find(c=>c.id===x.castId);return x.date===d.date&&cast&&isEmployedOn(cast,d.date)&&!isExcludedShift(x.schedule);}).length,specialCount=data.shiftSpecials.filter(x=>x.date===d.date&&x.note).length;return '<td class="'+(d.shopClosed?'shop-closed ':'')+'">'+(d.shopClosed?'店休':castCount+'人 ('+specialCount+')')+'</td>';}).join('')+'</tr>';
  const specialRows=[['interview','面接・体入'],['trial','面接・体入']].map(([type,label])=>'<tr class="shift-special-row '+type+'"><th>'+label+'</th>'+days.map(d=>{const item=data.shiftSpecials.find(x=>x.type===type&&x.date===d.date);const value=item?.note||'';return '<td class="'+(d.shopClosed?'shop-closed ':'')+'"><button type="button" onclick="editShiftSpecial(&quot;'+type+'&quot;,&quot;'+d.date+'&quot;)">'+(d.shopClosed?'':value)+'</button></td>';}).join('')+'</tr>').join('');
  const castRows=visibleCasts.map(c=>'<tr><th class="shift-cast-name">'+c.name+'</th>'+days.map(d=>{if(!isEmployedOn(c,d.date))return '<td class="outside-employment '+(d.shopClosed?'shop-closed ':'')+'"></td>';const shift=data.shifts.find(x=>x.castId===c.id&&x.date===d.date);const label=shift?(shift.schedule||shift.hours+'h'):'';const excluded=shift&&isExcludedShift(label);const cls=(shift?(excluded?'excluded-shift ':'has-shift '):'empty-shift ')+(d.shopClosed?'shop-closed ':'');return '<td class="'+cls+'"><button type="button" onclick="editShiftCell(&quot;'+c.id+'&quot;,&quot;'+d.date+'&quot;)">'+(d.shopClosed?'':label)+'</button></td>';}).join('')+'</tr>').join('');
  $('#shiftTableBody').innerHTML=counts+specialRows+(castRows||'<tr><td class="empty" colspan="'+(count+1)+'">キャストを追加してください</td></tr>');
  scrollShiftToToday();
  const periodGrid=(currentCast,title,periodDays)=>'<section class="cast-shift-period"><h4>'+title+'</h4><div class="cast-shift-days">'+periodDays.map(d=>{const shift=data.shifts.find(item=>item.castId===currentCast.id&&item.date===d.date);const rawLabel=shift?(shift.schedule||shift.hours+'h'):'';const label=d.shopClosed?'店休':(isExcludedShift(rawLabel)?'':rawLabel);const cls=(label?'has-value ':'')+(d.shopClosed?'shop-closed ':d.weekdayIndex===0?'sunday ':d.weekdayIndex===6?'saturday ':'');return '<div class="cast-shift-day '+cls+'"><span>'+d.monthDay+'（'+d.weekday+'）</span><b>'+label+'</b></div>';}).join('')+'</div></section>';
  const scheduleCasts=visibleCasts.filter(c=>data.shifts.some(item=>item.castId===c.id&&isEmployedOn(c,item.date)&&!isExcludedShift(item.schedule||item.hours)));
  if(!scheduleCasts.length){$('#shiftCastSummary').innerHTML='<p class="cast-shift-empty">シフトを入力すると、ここに個別送信用のシフト表が表示されます。</p>';}
  else{
    const selectedId=scheduleCasts.some(c=>c.id===window.shiftSummaryCastId)?window.shiftSummaryCastId:scheduleCasts[0].id;
    const currentCast=scheduleCasts.find(c=>c.id===selectedId);
    $('#shiftCastSummary').innerHTML='<label class="shift-cast-picker">送るキャストを選択<select id="shiftSummaryCast">'+scheduleCasts.map(c=>'<option value="'+c.id+'"'+(c.id===selectedId?' selected':'')+'>'+c.name+'</option>').join('')+'</select></label><article class="cast-shift-card"><h3>'+currentCast.name+'</h3>'+periodGrid(currentCast,'前期　1日〜15日',days.slice(0,15))+periodGrid(currentCast,'後期　16日〜末日',days.slice(15))+'</article>';
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
let expenseCategoryFilter='';
window.filterExpenseCategory=category=>{expenseCategoryFilter=category||'';renderExpenses();};
function renderExpenses(){const m={},expenses=data.expenses.filter(x=>expenseAccountingMonth(x)===data.month);expenses.forEach(x=>m[x.category]=(m[x.category]||0)+Number(x.amount));const categoryNames=[...new Set([...(data.settings.categories||[]),...Object.keys(m).filter(Boolean)])];const total=expenses.reduce((sum,item)=>sum+Number(item.amount||0),0),filteredExpenses=expenseCategoryFilter?expenses.filter(item=>item.category===expenseCategoryFilter):expenses;$('#expenseSummary').innerHTML='<button type="button" class="expense-total-card'+(!expenseCategoryFilter?' is-active':'')+'" data-category="" onclick="filterExpenseCategory(this.dataset.category)"><p>支出合計</p><strong>'+yen(total)+'</strong><small>'+expenses.length+'件 ・ すべて表示</small></button><section class="expense-category-list">'+categoryNames.map(category=>'<button type="button" class="expense-category-item'+(m[category]?'':' is-zero')+(expenseCategoryFilter===category?' is-active':'')+'" data-category="'+category+'" onclick="filterExpenseCategory(this.dataset.category)"><span>'+category+'</span><b>'+yen(m[category]||0)+'</b></button>').join('')+'</section>';const filterInfo=$('#expenseFilterInfo');if(filterInfo)filterInfo.textContent=expenseCategoryFilter?'「'+expenseCategoryFilter+'」の支出一覧':'カテゴリをクリックすると、そのカテゴリだけに絞り込めます。';$('#expenseTable').innerHTML=filteredExpenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<tr><td>${dateJP(x.date)}</td><td>${yen(x.amount)}</td><td>${x.company}</td><td><span class="status">${x.category}</span></td><td>${x.note||'—'}</td><td><button class="text-button" onclick="editExpense('${x.id}')">編集</button></td></tr>`).join('')||empty(6,expenseCategoryFilter?'このカテゴリの支出はありません':'支出はまだありません');}
function renderSettings(){
  const rate=(key,label)=>'<label class="setting-field">'+label+'<input data-setting="'+key+'" type="number" min="0" value="'+(data.settings[key]||0)+'"></label>';
  const labels={areaNomination:'場内指名バック（1本）',extension:'延長バック（1本）',mainNomination:'本指名バック（1本）',companion:'同伴バック（1本）'};
  const groups=[['フリー・場内',['free1000','free1500','free2000','free2500','free3000']],['本指名',['main1000','main1500','main2000','main2500','main3000','mainP','mainDecoration','mainBottle']],['同伴',['companion1000','companion1500','companion2000','companion2500','companion3000','companionP','companionDecoration','companionBottle']]];
  const labels2={free1000:'1,000円',free1500:'1,500円',free2000:'2,000円',free2500:'2,500円',free3000:'3,000円',main1000:'1,000円',main1500:'1,500円',main2000:'2,000円',main2500:'2,500円',main3000:'3,000円',mainP:'P',mainDecoration:'飾り物',mainBottle:'ボトル・シャンパン（%）',companion1000:'1,000円',companion1500:'1,500円',companion2000:'2,000円',companion2500:'2,500円',companion3000:'3,000円',companionP:'P',companionDecoration:'飾り物',companionBottle:'ボトル・シャンパン（%）'};
  const monthlyRule=(text,stepKey,stepUnit,addKey)=>'<div class="girls-payroll-rule"><span class="girls-payroll-rule-label">'+text+'</span><div class="girls-payroll-rule-fields">'+rate(stepKey,'')+'<span>'+stepUnit+'＋</span>'+rate(addKey,'')+'<span>円</span></div></div>';
  $('#girlsPayrollSettings').innerHTML=monthlyRule('月毎で本指名・同伴の合計本数が','monthlyMainCompanionStep','本毎に','monthlyMainCompanionAdd')+monthlyRule('月毎で同伴の本数が','monthlyCompanionStep','本毎に','monthlyCompanionAdd')+monthlyRule('月毎の売上が','monthlySalesStep','円毎に','monthlySalesAdd');
  $('#backSettings').innerHTML='<div class="setting-rate-section full"><h3>基本バック</h3><div class="daily-rate-grid">'+Object.entries(labels).map(([k,l])=>rate(k,l)).join('')+'</div></div><div class="setting-rate-section daily-rate-section full">'+groups.map(([title,keys],index)=>'<section class="back-rate-group back-rate-group-'+index+'"><h4>'+title+'</h4><div class="daily-rate-grid">'+keys.map(k=>rate(k,labels2[k])).join('')+'</div></section>').join('')+'</div>';
  $('#deductionSettings').innerHTML='<label class="setting-field">消費税（%）<input data-setting="consumptionTax" type="number" min="0" value="'+(data.settings.consumptionTax||0)+'"></label><label class="setting-field">所得税（%）<input data-setting="taxRate" type="number" min="0" value="'+(data.settings.taxRate||0)+'"></label><label class="setting-field full">厚生費（1出勤につき）<input data-setting="welfarePerShift" type="number" min="0" value="'+(data.settings.welfarePerShift||0)+'"></label>';
}
const empty=(n,text)=>`<tr><td colspan="${n}" class="empty">${text}</td></tr>`;
function scrollShiftToToday(){
  const wrap=$('.shift-table-wrap'),today=$('.shift-day-head[data-shift-date="'+todayKey()+'"]'),nameHead=$('.shift-name-head');
  if(!wrap||!today||!nameHead||!$('#shifts').classList.contains('active'))return;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const wrapBox=wrap.getBoundingClientRect(),todayBox=today.getBoundingClientRect(),nameBox=nameHead.getBoundingClientRect();
    const delta=todayBox.left-(nameBox.right+12);
    const maximum=Math.max(0,wrap.scrollWidth-wrap.clientWidth);
    wrap.scrollLeft=Math.max(0,Math.min(maximum,wrap.scrollLeft+delta));
  }));
}
function setView(id){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===id));document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===id));const h=document.querySelector(`#${id} h2`);$('#pageTitle').textContent=id==='dashboard'?monthLabel():h.textContent;$('#monthButton').hidden=id==='cast-management';closeMenu();window.scrollTo({top:0,behavior:'smooth'});if(id==='shifts')scrollShiftToToday();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));document.querySelectorAll('[data-view-target]').forEach(b=>b.onclick=()=>setView(b.dataset.viewTarget));const changeMonth=e=>{const value=e.target.value;if(!/^\d{4}-\d{2}$/.test(value))return;data.month=value;save();render();};$('#monthButton').onchange=changeMonth;$('#monthButton').oninput=changeMonth;
const dialog=$('#entryDialog'), form=$('#entryForm'), fields=$('#formFields'), mediaOrderDialog=$('#mediaOrderDialog'), mediaOrderList=$('#mediaOrderList'), paymentMethodDialog=$('#paymentMethodDialog'), paymentMethodForm=$('#paymentMethodForm'), paymentMethodList=$('#paymentMethodList'), customerHistoryDialog=$('#customerHistoryDialog'), customerHistoryList=$('#customerHistoryList'), customerPickerDialog=$('#customerPickerDialog'), customerPickerList=$('#customerPickerList'), expenseOptionDialog=$('#expenseOptionDialog'), expenseOptionForm=$('#expenseOptionForm'), expenseOptionList=$('#expenseOptionList');let mode='', slipDateSort='desc', dailyInputDateSort='asc', editingCastId=null, editingDailyInputId=null, editingApplicationId=null, editingSlipIndex=null, editingExpenseId=null, editingPayrollCastId=null, mediaOrderDraft=[], expenseOptionType='';
function expenseOptionItems(){return expenseOptionType==='category'?data.settings.categories:(data.settings.payeeHistory||(data.settings.payeeHistory=[]));}
function expenseHiddenOptionItems(type){
  const hidden=data.settings.hiddenExpenseOptions||(data.settings.hiddenExpenseOptions={categories:[],payees:[]});
  const key=type==='category'?'categories':'payees';
  if(!Array.isArray(hidden[key]))hidden[key]=[];
  return hidden[key];
}
function isExpenseOptionHidden(type,name){return expenseHiddenOptionItems(type).includes(name);}
function visibleExpenseOptionItems(type){return expenseOptionItemsFor(type).filter(name=>!isExpenseOptionHidden(type,name));}
function expenseOptionItemsFor(type){return type==='category'?data.settings.categories:(data.settings.payeeHistory||(data.settings.payeeHistory=[]));}
function expenseOptionItems(){return expenseOptionItemsFor(expenseOptionType);}
function refreshExpenseOptionSelect(type,selectedValue){
  const isCategory=type==='category',list=visibleExpenseOptionItems(type);
  const select=fields.querySelector(isCategory?'[name="category"]':'[name="company"]');
  if(!select)return;
  const current=selectedValue===undefined?select.value:selectedValue;
  select.innerHTML='<option value="">選択してください</option>'+list.map(item=>'<option>'+item+'</option>').join('');
  select.value=list.includes(current)?current:(list[0]||'');
}
function payeeCategory(name){return String(data.settings.payeeCategories?.[name]||'');}
function renderExpenseOptionList(){
  const list=expenseOptionItems(),categories=visibleExpenseOptionItems('category');
  expenseOptionList.innerHTML=list.map((item,index)=>{
    const hidden=isExpenseOptionHidden(expenseOptionType,item);
    const categoryControl=expenseOptionType==='payee'?'<label class="expense-payee-category">カテゴリ<select aria-label="'+item+'のカテゴリ設定" onchange="setExpensePayeeCategory('+index+',this.value)"><option value="">未設定</option>'+categories.map(category=>'<option value="'+category+'"'+(payeeCategory(item)===category?' selected':'')+'>'+category+'</option>').join('')+'</select></label>':'';
    return '<div class="payment-method-row expense-option-row"><span>'+item+(hidden?'<small class="expense-option-hidden">非表示</small>':'')+'</span>'+categoryControl+'<div><button type="button" onclick="editExpenseOption('+index+')">編集</button><button type="button" class="expense-option-visibility" onclick="toggleExpenseOptionHidden('+index+')">'+(hidden?'再表示':'非表示')+'</button><button type="button" onclick="moveExpenseOption('+index+',-1)" '+(index===0?'disabled':'')+'>↑</button><button type="button" onclick="moveExpenseOption('+index+',1)" '+(index===list.length-1?'disabled':'')+'>↓</button></div></div>';
  }).join('')||'<p class="media-order-empty">登録済みの項目はありません。</p>';
}
window.openExpenseOptionDialog=type=>{
  expenseOptionType=type;
  const isCategory=type==='category';
  $('#expenseOptionTitle').textContent=isCategory?'カテゴリを管理':'会社名・支払先を管理';
  $('#expenseOptionNameLabel').textContent=isCategory?'カテゴリを追加':'会社名・支払先を追加';
  expenseOptionForm.reset();
  renderExpenseOptionList();
  if(typeof expenseOptionDialog.showModal==='function')expenseOptionDialog.showModal();else expenseOptionDialog.setAttribute('open','');
};
window.closeExpenseOptionDialog=()=>{if(typeof expenseOptionDialog.close==='function')expenseOptionDialog.close();else expenseOptionDialog.removeAttribute('open');};
window.moveExpenseOption=(index,direction)=>{
  const list=expenseOptionItems(),target=index+direction;
  if(target<0||target>=list.length)return;
  [list[index],list[target]]=[list[target],list[index]];
  save();
  refreshExpenseOptionSelect(expenseOptionType);
  renderExpenseOptionList();
};
window.setExpensePayeeCategory=(index,category)=>{
  const payee=expenseOptionItems()[index];if(!payee)return;
  const map=data.settings.payeeCategories||(data.settings.payeeCategories={});
  if(category)map[payee]=category;else delete map[payee];
  save();renderExpenseOptionList();
};
window.editExpenseOption=index=>{
  const list=expenseOptionItems(),before=list[index];
  const after=(prompt('名称を編集してください',before)||'').trim();
  if(!after||after===before)return;
  if(list.includes(after)){alert('同じ名称がすでに登録されています。');return;}
  list[index]=after;
  const hidden=expenseHiddenOptionItems(expenseOptionType),hiddenIndex=hidden.indexOf(before);
  if(hiddenIndex>=0)hidden[hiddenIndex]=after;
  if(expenseOptionType==='payee'){const map=data.settings.payeeCategories||(data.settings.payeeCategories={});if(Object.prototype.hasOwnProperty.call(map,before)){map[after]=map[before];delete map[before];}}
  if(expenseOptionType==='category'){const map=data.settings.payeeCategories||(data.settings.payeeCategories={});Object.keys(map).forEach(payee=>{if(map[payee]===before)map[payee]=after;});}
  const key=expenseOptionType==='category'?'category':'company';
  data.expenses.forEach(item=>{if(item[key]===before)item[key]=after;});
  save();
  refreshExpenseOptionSelect(expenseOptionType,after);
  renderExpenseOptionList();
};
window.toggleExpenseOptionHidden=index=>{
  const name=expenseOptionItems()[index],hidden=expenseHiddenOptionItems(expenseOptionType),at=hidden.indexOf(name);
  if(at>=0)hidden.splice(at,1);else hidden.push(name);
  save();
  refreshExpenseOptionSelect(expenseOptionType);
  renderExpenseOptionList();
};
expenseOptionForm.addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('#expenseOptionName').value.trim();
  if(!name)return;
  const list=expenseOptionItems();
  if(list.includes(name)){alert('同じ名称がすでに登録されています。');return;}
  list.push(name);
  save();
  refreshExpenseOptionSelect(expenseOptionType,name);
  expenseOptionForm.reset();
  renderExpenseOptionList();
});
function showEntryDialog(){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
function closeEntryDialog(){if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');}
function renderMediaOrderList(){mediaOrderList.innerHTML=mediaOrderDraft.map((name,index)=>'<div class="media-order-row"><span>'+name+'</span><div><button type="button" onclick="moveApplicationMedia('+index+',-1)" '+(index===0?'disabled':'')+'>↑</button><button type="button" onclick="moveApplicationMedia('+index+',1)" '+(index===mediaOrderDraft.length-1?'disabled':'')+'>↓</button></div></div>').join('')||'<p class="media-order-empty">媒体がありません。</p>';}
window.openApplicationMediaOrder=()=>{mediaOrderDraft=[...data.settings.applicationMedia];renderMediaOrderList();if(typeof mediaOrderDialog.showModal==='function')mediaOrderDialog.showModal();else mediaOrderDialog.setAttribute('open','');};
window.moveApplicationMedia=(index,direction)=>{const target=index+direction;if(target<0||target>=mediaOrderDraft.length)return;[mediaOrderDraft[index],mediaOrderDraft[target]]=[mediaOrderDraft[target],mediaOrderDraft[index]];renderMediaOrderList();};
$('#saveMediaOrder').onclick=()=>{data.settings.applicationMedia=[...mediaOrderDraft];save();if(typeof mediaOrderDialog.close==='function')mediaOrderDialog.close();else mediaOrderDialog.removeAttribute('open');};
$('#cancelMediaOrder').onclick=()=>{if(typeof mediaOrderDialog.close==='function')mediaOrderDialog.close();else mediaOrderDialog.removeAttribute('open');};
function closePaymentMethodDialog(){if(typeof paymentMethodDialog.close==='function')paymentMethodDialog.close();else paymentMethodDialog.removeAttribute('open');}
function refreshPaymentMethodSelect(selectedValue){
  const selects=[...fields.querySelectorAll('.slip-payment-method')];if(!selects.length)return;
  selects.forEach((payment,index)=>{
    const current=index===0&&selectedValue!==undefined?selectedValue:payment.value;
    payment.innerHTML='<option value="">選択してください</option>'+paymentMethodOptions();
    payment.value=current;
  });
}
function renderPaymentMethodList(){
  paymentMethodList.innerHTML=paymentMethods().map((item,index)=>'<div class="payment-method-row"><span>'+item.name+'<small>'+ (item.category==='cash'?'現金扱い':item.category==='receivable'?'未収扱い':'カード扱い')+'</small></span><div><button type="button" onclick="movePaymentMethod('+index+',-1)" '+(index===0?'disabled':'')+'>↑</button><button type="button" onclick="movePaymentMethod('+index+',1)" '+(index===paymentMethods().length-1?'disabled':'')+'>↓</button></div></div>').join('');
}
window.openPaymentMethodDialog=()=>{paymentMethodForm.reset();renderPaymentMethodList();if(typeof paymentMethodDialog.showModal==='function')paymentMethodDialog.showModal();else paymentMethodDialog.setAttribute('open','');};
window.movePaymentMethod=(index,direction)=>{const target=index+direction,list=data.settings.paymentMethods;if(target<0||target>=list.length)return;[list[index],list[target]]=[list[target],list[index]];save();refreshPaymentMethodSelect();renderPaymentMethodList();};
$('#closePaymentMethodDialog').onclick=closePaymentMethodDialog;
$('#cancelPaymentMethodDialog').onclick=closePaymentMethodDialog;
$('#closeCustomerHistoryDialog').onclick=()=>{if(typeof customerHistoryDialog.close==='function')customerHistoryDialog.close();else customerHistoryDialog.removeAttribute('open');};
paymentMethodForm.addEventListener('submit',event=>{event.preventDefault();const value=Object.fromEntries(new FormData(paymentMethodForm)),name=(value.name||'').trim();if(!name){return;}const category=value.category||'card';if(!paymentMethods().some(item=>item.name===name))data.settings.paymentMethods.push({name,category});save();refreshPaymentMethodSelect(name);paymentMethodForm.reset();renderPaymentMethodList();});
document.querySelectorAll('[data-close-dialog]').forEach(button=>button.onclick=closeEntryDialog);
const field=(label,name,type='text',cls='')=>`<label class="field ${cls}">${label}<input name="${name}" type="${type}"></label>`;
const optionalField=(label,name,type='text',cls='')=>`<label class="field ${cls}">${label}<input name="${name}" type="${type}"></label>`;
const calculatorNumber=value=>{
  const expression=String(value??'').replace(/[￥¥,\s]/g,'').replace(/＋/g,'+').replace(/－/g,'-').replace(/×/g,'*').replace(/÷/g,'/');
  if(!expression)return 0;
  if(!/^[0-9.+\-*/()]+$/.test(expression))return Number(value)||0;
  try{const result=Function('"use strict";return ('+expression+')')();return Number.isFinite(result)?Math.round(result*100)/100:0;}catch(error){return 0;}
};
document.addEventListener('focusout',event=>{
  const input=event.target;
  if(!input?.classList?.contains('calculator-input')||!String(input.value||'').trim())return;
  input.value=String(calculatorNumber(input.value));
});
const normalizeDailyTime=value=>{
  const raw=String(value??'').trim();
  if(!raw)return '';
  const match=raw.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if(!match)return raw;
  const hour=Number(match[1]),minute=match[2]===undefined?0:Number(match[2]);
  if(hour<0||hour>23||minute<0||minute>59)return raw;
  return String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
};
const timeField=(label,name,cls='')=>{
  if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return '<label class="field '+cls+'">'+label+'<input name="'+name+'" type="time" step="1800"></label>';
  const options=Array.from({length:24},(_,i)=>'<option value="'+String(i).padStart(2,'0')+'">'+String(i).padStart(2,'0')+'</option>').join('');
  const minutes=['00','30'].map(i=>'<option value="'+i+'">'+i+'</option>').join('');
  return '<label class="field time-picker-field '+cls+'">'+label+'<div class="desktop-time-picker" data-time-name="'+name+'"><select class="time-hour"><option value="">--</option>'+options+'</select><span>:</span><select class="time-minute"><option value="">--</option>'+minutes+'</select><input type="hidden" name="'+name+'"></div></label>';
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
const useNativeBatchTime=()=>Boolean(window.matchMedia?.('(pointer: coarse)').matches);
const batchTimePicker=kind=>'<div class="batch-time"><select class="batch-'+kind+'-hour"><option value="">--</option>'+Array.from({length:12},(_,i)=>'<option value="'+String(i+1)+'">'+String(i+1)+'</option>').join('')+'</select><span>:</span><select class="batch-'+kind+'-minute"><option value="">--</option><option value="00">00</option><option value="30">30</option></select></div>';
function batchRowTime(row,kind){const native=row.querySelector('.batch-'+kind+'-time');if(native)return native.value||'';const hour=row.querySelector('.batch-'+kind+'-hour')?.value||'',minute=row.querySelector('.batch-'+kind+'-minute')?.value||'';return hour&&minute?hour+':'+minute:'';}
function calculateBatchHours(row){const start=batchRowTime(row,'start'),end=batchRowTime(row,'end');const output=row.querySelector('.batch-hours');if(!start||!end){output.value='';return '';}const parse=v=>{const [h,m]=v.split(':').map(Number);return h*60+m;};let a=parse(start),b=parse(end);if(b<a){const h=Math.floor(a/60),eh=Math.floor(b/60);b+=h>=7&&h<=12&&eh<=6?720:1440;}const hours=String(Number(((b-a)/60).toFixed(2)));output.value=hours;return hours;}
function bindBatchRow(row){row.querySelectorAll('select,input.batch-native-time').forEach(field=>{field.onchange=()=>calculateBatchHours(row);field.oninput=()=>calculateBatchHours(row)});row.querySelector('.remove-batch-cast').onclick=()=>{row.querySelectorAll('input').forEach(input=>input.value='');row.querySelectorAll('select:not(.batch-cast-select)').forEach(select=>select.value='');row.querySelector('.batch-hours').value='';};}
function bindBatchHours(){fields.querySelectorAll('.daily-batch-row').forEach(bindBatchRow);}
const backInputKeys=['free1000','free1500','free2000','free2500','free3000','main1000','main1500','main2000','main2500','main3000','mainP','mainDecoration','mainBottle','mainChampagne','mainExtension','companion1000','companion1500','companion2000','companion2500','companion3000','companionP','companionDecoration','companionBottle','companionChampagne','companionExtension'];
const backInputLabels={free1000:'1,000円',free1500:'1,500円',free2000:'2,000円',free2500:'2,500円',free3000:'3,000円',main1000:'1,000円',main1500:'1,500円',main2000:'2,000円',main2500:'2,500円',main3000:'3,000円',mainP:'P',mainDecoration:'飾り物',mainBottle:'ボトル',mainChampagne:'シャンパン',mainExtension:'延長指名',companion1000:'1,000円',companion1500:'1,500円',companion2000:'2,000円',companion2500:'2,500円',companion3000:'3,000円',companionP:'P',companionDecoration:'飾り物',companionBottle:'ボトル',companionChampagne:'シャンパン',companionExtension:'延長指名'};
const backGroups=[['フリー・場内',['free1000','free1500','free2000','free2500','free3000']],['本指名',['mainExtension','main1000','main1500','main2000','main2500','main3000','mainP','mainDecoration','mainBottle','mainChampagne']],['同伴',['companionExtension','companion1000','companion1500','companion2000','companion2500','companion3000','companionP','companionDecoration','companionBottle','companionChampagne']]];
const batchBackDetail=()=>'<details class="batch-back-detail"><summary>バック打込み</summary>'+backGroups.map(([title,keys],index)=>{const count=index===1?'<label>本指名<input class="batch-main" type="number" min="0"></label>':index===2?'<label>同伴<input class="batch-companion" type="number" min="0"></label>':'';return '<section class="back-detail-group group-'+index+'"><h4>'+title+'</h4><div>'+count+keys.map(key=>'<label>'+backInputLabels[key]+'<input class="batch-'+key+'" type="number" min="0"></label>').join('')+'</div></section>';}).join('')+'</details>';
const dailyBackDetail=()=>'<details class="daily-back-detail full"><summary>バック打込み</summary>'+backGroups.map(([title,keys],index)=>{const count=index===1?'<label>本指名<input name="mainCount" type="number" min="0"></label>':index===2?'<label>同伴<input name="companionCount" type="number" min="0"></label>':'';return '<section class="back-detail-group group-'+index+'"><h4>'+title+'</h4><div>'+count+keys.map(key=>'<label>'+backInputLabels[key]+'<input name="'+key+'" type="number" min="0"></label>').join('')+'</div></section>';}).join('')+'</details>';
function availableDailyInputCasts(){const currentMonth=String(data.month||'');return sortedCasts().filter(c=>{const joined=dateKey(c.joinedDate).slice(0,7),leaving=dateKey(c.leavingDate).slice(0,7);return !c.hidden&&(!joined||joined<=currentMonth)&&(!leaving||leaving>=currentMonth);});}
function batchCastRow(castId=''){const casts=availableDailyInputCasts();const options='<option value=""'+(!castId?' selected':'')+'>選択してください</option>'+casts.map(c=>'<option value="'+c.id+'"'+(c.id===castId?' selected':'')+'>'+c.name+'</option>').join('');return '<article class="daily-batch-row" data-cast-id="'+castId+'"><div class="batch-cast-head"><label><small>キャスト</small><select class="batch-cast-select">'+options+'</select></label><button type="button" class="text-button remove-batch-cast">リセット</button></div><details class="batch-basic-input" open><summary>基本入力</summary><div class="batch-basic-fields"><div class="batch-time-field batch-top-field"><small>出勤</small>'+batchTimePicker('start')+'</div><div class="batch-time-field batch-top-field"><small>退勤</small>'+batchTimePicker('end')+'</div><label class="batch-work-field batch-top-field"><small>実働</small><output class="batch-hours"></output></label><label class="batch-attendance-field batch-top-field"><small>勤怠</small><select class="batch-attendance"><option value="">—</option><option value="遅刻">遅刻</option><option value="当欠">当欠</option><option value="無欠">無欠</option></select></label><label class="batch-four-field"><small>場内</small><input class="batch-area" type="number"></label><label class="batch-four-field"><small>日払い</small><input class="batch-advance" type="number"></label><label class="batch-four-field"><small>手当</small><input class="batch-allowance" type="number"></label><label class="batch-four-field"><small>引き物</small><input class="batch-deduction" type="number"></label><label class="batch-sales-field"><small>本指名売上</small><input class="batch-sales calculator-input" type="text" inputmode="decimal" placeholder="例：9000+9000"></label></div></details>'+batchBackDetail()+'</article>';}
window.addBatchCastRow=()=>{const list=$('#batchCastList');list.insertAdjacentHTML('beforeend',batchCastRow());const row=list.lastElementChild,select=row.querySelector('.batch-cast-select');select.value='';row.dataset.castId='';bindBatchRow(row);select.onchange=()=>row.dataset.castId=select.value;};
function businessDate(){
  const d=new Date();
  if(d.getHours()<6)d.setDate(d.getDate()-1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function paymentMethods(){
  const existing=Array.isArray(data.settings.paymentMethods)?data.settings.paymentMethods:[];
  const missing=defaultData.settings.paymentMethods.filter(item=>!existing.some(current=>current.name===item.name));
  if(missing.length)data.settings.paymentMethods=[...existing,...missing];
  return data.settings.paymentMethods;
}
function paymentMethodCategory(name){return paymentMethods().find(item=>item.name===name)?.category||(name==='現金'?'cash':name==='未収'?'receivable':'card');}
function paymentMethodOptions(){return paymentMethods().map(item=>'<option value="'+String(item.name).replace(/"/g,'&quot;')+'">'+item.name+'</option>').join('');}
function slipPaymentLines(slip){
  if(Array.isArray(slip?.payments)&&slip.payments.length)return slip.payments.filter(item=>item?.method).map(item=>({method:item.method,amount:Number(item.amount||0)}));
  const total=Number(slip?.total||0),card=Math.max(0,Number(slip?.card||0)),method=slip?.payment||(card?'カード':'現金');
  if(card>0&&card<total)return [{method:'現金',amount:total-card},{method,amount:card}];
  return method?[{method,amount:total}]:[];
}
function slipPaymentSummary(slip){
  const lines=slipPaymentLines(slip).filter(item=>item.amount>0);
  return lines.length?lines.map(item=>item.method+' '+yen(item.amount)).join(' / '):'—';
}
function slipPaymentCashOnly(slip){
  const lines=slipPaymentLines(slip).filter(item=>item.amount>0);
  return lines.length>0&&lines.every(item=>paymentMethodCategory(item.method)==='cash');
}
function hasReceivablePayment(slip){return Number(slip?.receivable||0)>0||slipPaymentLines(slip).some(item=>item.amount>0&&paymentMethodCategory(item.method)==='receivable');}
function isUnsettledSlip(slip){return hasReceivablePayment(slip)&&!slip?.receivedDate;}
function slipSalesPostingDate(slip){return dateKey(slip?.receivedDate||slip?.date);}
function slipPaymentRow(line={},canRemove=false){
  const selected=String(line.method||'');
  return '<div class="slip-payment-row"><select class="slip-payment-method"><option value="">選択してください</option>'+paymentMethodOptions()+'</select><input class="slip-payment-amount" type="number" inputmode="numeric" min="0" placeholder="金額" value="'+(line.amount||'')+'">'+(canRemove?'<button type="button" class="slip-payment-remove" onclick="removeSlipPaymentRow(this)" aria-label="この決済を削除">×</button>':'<span></span>')+'</div>';
}
function syncSlipPaymentTotal(){
  const total=fields.querySelector('[name="total"]');if(!total)return;
  const sum=[...fields.querySelectorAll('.slip-payment-amount')].reduce((n,input)=>n+Number(input.value||0),0);
  total.value=sum||'';
}
function bindSlipPaymentRows(){
  fields.querySelectorAll('.slip-payment-row').forEach(row=>{
    const method=row.querySelector('.slip-payment-method');
    if(method)method.value=row.dataset.method||'';
    row.querySelectorAll('select,input').forEach(input=>{input.onchange=syncSlipPaymentTotal;input.oninput=syncSlipPaymentTotal;});
  });
}
function slipNumberRow(value='',canRemove=false){
  return '<div class="slip-number-row"><input class="slip-id-input" type="text" inputmode="numeric" autocomplete="off" aria-label="伝票番号（数字のみ）" value="'+String(value||'').replace(/"/g,'&quot;')+'">'+(canRemove?'<button type="button" class="slip-number-remove" onclick="removeSlipNumberRow(this)" aria-label="伝票番号を削除">×</button>':'<span></span>')+'</div>';
}
function renderSlipNumberRows(values=['']){
  const holder=fields.querySelector('#slipNumberRows');if(!holder)return;
  const rows=values.length?values:[''];
  holder.innerHTML=rows.map((value,index)=>slipNumberRow(value,rows.length>1)).join('');
}
window.addSlipNumberRow=()=>{
  const values=[...fields.querySelectorAll('.slip-id-input')].map(input=>input.value);
  values.push('');renderSlipNumberRows(values);
};
window.removeSlipNumberRow=button=>{
  const rows=[...fields.querySelectorAll('.slip-number-row')],index=rows.indexOf(button.closest('.slip-number-row'));
  const values=rows.map(row=>row.querySelector('.slip-id-input').value);values.splice(index,1);renderSlipNumberRows(values.length?values:['']);
};
function renderSlipPaymentRows(lines=[{}]){
  const holder=fields.querySelector('#slipPaymentRows');if(!holder)return;
  holder.innerHTML=lines.map((line,index)=>slipPaymentRow(line,lines.length>1)).join('');
  [...holder.querySelectorAll('.slip-payment-row')].forEach((row,index)=>row.dataset.method=String(lines[index]?.method||''));
  bindSlipPaymentRows();
}
window.addSlipPaymentRow=()=>{
  const lines=[...fields.querySelectorAll('.slip-payment-row')].map(row=>({method:row.querySelector('.slip-payment-method').value,amount:row.querySelector('.slip-payment-amount').value}));
  lines.push({});renderSlipPaymentRows(lines);
};
window.removeSlipPaymentRow=button=>{
  const rows=[...fields.querySelectorAll('.slip-payment-row')],index=rows.indexOf(button.closest('.slip-payment-row'));
  const lines=rows.map(row=>({method:row.querySelector('.slip-payment-method').value,amount:row.querySelector('.slip-payment-amount').value}));
  lines.splice(index,1);renderSlipPaymentRows(lines.length?lines:[{}]);syncSlipPaymentTotal();
};
function bindPaymentMethodAdder(){
  const select=fields.querySelector('[name="payment"]'),adder=fields.querySelector('#newPaymentMethodFields');
  if(!select||!adder)return;
  const toggle=()=>adder.hidden=select.value!=='__new__';
  select.onchange=toggle;toggle();
}
function allCustomerNames(){return [...new Set(data.slips.map(x=>x.customerName).filter(Boolean))];}
function orderedCustomerNames(){
  const names=allCustomerNames(),order=data.settings.customerNameOrder||[];
  return [...order.filter(name=>names.includes(name)),...names.filter(name=>!order.includes(name))];
}
function customerNames(){
  const hidden=data.settings.hiddenCustomerNames||[];
  return orderedCustomerNames().filter(name=>!hidden.includes(name));
}
function customerOptions(){
  return customerNames().map(name=>'<option value="'+String(name).replace(/"/g,'&quot;')+'"></option>').join('');
}
function renderCustomerHistoryList(){
  const names=customerNames();
  customerHistoryList.innerHTML=names.map((name,index)=>'<div class="customer-history-row"><span>'+name+'</span><div><button type="button" onclick="moveCustomerHistory('+index+',-1)" '+(index===0?'disabled':'')+'>↑</button><button type="button" onclick="moveCustomerHistory('+index+',1)" '+(index===names.length-1?'disabled':'')+'>↓</button><button type="button" class="customer-history-remove" onclick="hideCustomerHistoryName(\''+encodeURIComponent(name)+'\')">×</button></div></div>').join('')||'<small>表示中の履歴はありません</small>';
}
window.openCustomerHistoryDialog=()=>{renderCustomerHistoryList();if(typeof customerHistoryDialog.showModal==='function')customerHistoryDialog.showModal();else customerHistoryDialog.setAttribute('open','');};
function renderCustomerPickerList(){
  const names=customerNames();
  customerPickerList.innerHTML=names.map(name=>'<button type="button" class="customer-pick-option" onclick="selectCustomerHistoryName(\''+encodeURIComponent(name)+'\')">'+name+'</button>').join('')||'<small>表示中の履歴はありません</small>';
}
window.openCustomerPickerDialog=()=>{renderCustomerPickerList();if(typeof customerPickerDialog.showModal==='function')customerPickerDialog.showModal();else customerPickerDialog.setAttribute('open','');};
window.closeCustomerPickerDialog=()=>{if(typeof customerPickerDialog.close==='function')customerPickerDialog.close();else customerPickerDialog.removeAttribute('open');};
window.selectCustomerHistoryName=encoded=>{const input=fields.querySelector('[name="customerName"]');if(input)input.value=decodeURIComponent(encoded);window.closeCustomerPickerDialog();};
window.moveCustomerHistory=(index,direction)=>{
  const names=customerNames(),target=index+direction;if(target<0||target>=names.length)return;
  [names[index],names[target]]=[names[target],names[index]];
  data.settings.customerNameOrder=names;save();
  const list=$('#customerHistory');if(list)list.innerHTML=customerOptions();
  renderCustomerHistoryList();
};
window.hideCustomerHistoryName=encoded=>{
  const name=decodeURIComponent(encoded);
  if(!data.settings.hiddenCustomerNames.includes(name))data.settings.hiddenCustomerNames.push(name);
  save();
  const list=$('#customerHistory');if(list)list.innerHTML=customerOptions();
  renderCustomerHistoryList();
};
function payeeOptions(){return (data.settings.payeeHistory||[]).map(name=>'<option value="'+String(name).replace(/"/g,'&quot;')+'"></option>').join('');}
function expenseHistoryManager(){const chips=(items,type)=>items.map((name,index)=>'<button type="button" class="history-chip" data-history-type="'+type+'" data-history-index="'+index+'">'+name+' <b>×</b></button>').join('')||'<small>まだ履歴はありません</small>';return '<details class="customer-history expense-history full"><summary>履歴を管理</summary><div class="expense-history-body"><div class="history-group"><span>カテゴリ</span><div>'+chips(data.settings.categories,'category')+'</div></div><div class="history-group"><span>会社名・支払先</span><div>'+chips(data.settings.payeeHistory||[],'payee')+'</div></div></div></details>';}
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
function openForm(type,castId=null){mode=type;const payrollDetailsEditButton=$('#payrollDetailsEditButton');if(payrollDetailsEditButton){payrollDetailsEditButton.hidden=true;payrollDetailsEditButton.onclick=null;}const primarySave=form.querySelector('.primary-button[value="save"]');primarySave.type='submit';primarySave.onclick=null;form.autocomplete=(type==='cast'||type==='application')?'off':'on';fields.classList.toggle('cast-profile-fields',type==='cast');fields.classList.toggle('daily-input-edit-fields',type==='dailyInput');editingCastId=type==='cast'?castId:null;editingDailyInputId=type==='dailyInput'?castId:null;editingApplicationId=type==='application'?castId:null;editingSlipIndex=type==='slip'&&castId!==null?Number(castId):null;editingExpenseId=type==='expense'?castId:null;editingPayrollCastId=(type==='payroll'||type==='payrollDetails')?castId:null;form.querySelector('[value="save"]').hidden=(type==='dailyDetails'||type==='payrollDetails');$('#deleteCastButton').hidden=!(type==='cast'&&editingCastId);const castVisibilityButton=$('#toggleCastVisibilityButton');castVisibilityButton.hidden=!(type==='cast'&&editingCastId);if(type==='cast'&&editingCastId){const cast=data.casts.find(c=>c.id===editingCastId);castVisibilityButton.textContent=cast?.hidden?'表示に戻す':'非表示';}$('#deleteApplicationButton').hidden=!(type==='application'&&editingApplicationId);$('#deleteSlipButton').hidden=!(type==='slip'&&editingSlipIndex!==null);$('#deleteExpenseButton').hidden=!(type==='expense'&&editingExpenseId);$('#deleteDailyInputButton').hidden=!(type==='dailyInput'&&editingDailyInputId);$('#dialogKicker').textContent='';
 if(type==='payroll'){
   const cast=data.casts.find(item=>item.id===editingPayrollCastId);const current=cast?calcCast(cast):null;const adjustment=payrollAdjustment(editingPayrollCastId);const manual=(key,label,auto)=>optionalField(label+'（自動：'+auto+'）',key,'number');
   $('#dialogTitle').textContent=(cast?.name||'キャスト')+' の給与を編集';
   fields.innerHTML='<div class="full payroll-edit-note">空欄は日別打込みの自動集計を使用します。入力した項目だけ、この月の給与で手入力を優先します。</div>'+field('基本時給（以後の計算に反映）','baseHourly','number')+manual('nominated','本指名売上',yen(current?.nominated))+manual('area','場内 本数',(current?.area||0)+'本')+manual('main','本指名 本数',(current?.main||0)+'本')+manual('companion','同伴 本数',(current?.companion||0)+'本')+manual('hours','勤務時間',(current?.hours||0).toFixed(1)+'h')+manual('hourly','時給支給額',yen(current?.hourly))+manual('back','バック計',yen(current?.back))+manual('allowance','手当',yen(current?.allowance))+manual('deductions','控除・日払い',yen((current?.deductions||0)+(current?.advance||0)))+manual('payout','支給額',yen(current?.payout));
   if(cast)fields.querySelector('[name="baseHourly"]').value=cast.hourly??0;
   ['nominated','area','main','companion','hours','hourly','back','allowance','deductions','payout'].forEach(key=>{const input=fields.querySelector('[name="'+key+'"]').value=adjustment[key]??'';});
 } if(type==='slip'){
   const slip=editingSlipIndex!==null?data.slips[editingSlipIndex]:null;
   $('#dialogTitle').textContent=slip?'伝票を編集':'伝票を入力';
   fields.innerHTML=optionalField('日付','date','date')+optionalField('入金完了日（未収のみ）','receivedDate','date')+
   '<div class="field slip-id-field"><span>伝票番号</span><div class="slip-number-layout"><div class="slip-number-rows" id="slipNumberRows"></div><button type="button" class="slip-number-add" onclick="addSlipNumberRow()">＋ 伝票番号を追加</button></div></div>'+
   '<label class="field customer-field"><span>顧客名<button type="button" class="customer-history-open-button" onclick="openCustomerPickerDialog()">履歴</button><button type="button" class="payment-add-button customer-history-button" onclick="openCustomerHistoryDialog()" aria-label="顧客名履歴を管理">＋</button></span><input name="customerName" list="customerHistory" autocomplete="off"></label><datalist id="customerHistory">'+customerOptions()+'</datalist>'+
   optionalField('人数','guests','number')+
   '<div class="field auto-total-field"><span>売上</span><div class="sales-total-row"><input name="total" type="number" readonly tabindex="-1" aria-label="決済内訳から自動計算される売上"><label class="receipt-check"><input name="receipt" type="checkbox">領収証</label></div></div>'+
   '<div class="field payment-breakdown-field"><span>決済<button type="button" class="payment-add-button" onclick="openPaymentMethodDialog()" aria-label="決済方法を追加">＋</button></span><div id="slipPaymentRows" class="slip-payment-rows"></div><button type="button" class="slip-payment-add" onclick="addSlipPaymentRow()">＋ 決済を追加</button></div>';
   if(slip){fields.querySelector('[name="date"]').value=slip.date||'';fields.querySelector('[name="receivedDate"]').value=slip.receivedDate||'';fields.querySelector('[name="customerName"]').value=slip.customerName||'';fields.querySelector('[name="guests"]').value=slip.guests||'';fields.querySelector('[name="total"]').value=slip.total||'';fields.querySelector('[name="receipt"]').checked=Boolean(slip.receipt);}
   renderSlipNumberRows(slip?String(slip.id||'').split(/\s*\/\s*/):['']);
   renderSlipPaymentRows(slip?slipPaymentLines(slip):[{}]);
 } if(type==='expense'){const expense=data.expenses.find(item=>item.id===editingExpenseId);$('#dialogTitle').textContent=expense?'支出を編集':'支出を入力';const payees=visibleExpenseOptionItems('payee'),categories=visibleExpenseOptionItems('category');if(expense?.company&&!payees.includes(expense.company))payees.unshift(expense.company);if(expense?.category&&!categories.includes(expense.category))categories.unshift(expense.category);fields.innerHTML=field('支出日','date','date','expense-date-field')+optionalField('計上月（支出月と異なる場合のみ）','accountingMonth','month')+field('金額','amount','number')+'<label class="field expense-select-field"><span>会社名・支払先<button type="button" class="payment-add-button" onclick="openExpenseOptionDialog(\'payee\')" aria-label="会社名・支払先を追加">＋</button></span><select name="company"><option value="" selected>選択してください</option>'+payees.map(x=>'<option>'+x+'</option>').join('')+'</select></label>'+'<label class="field expense-select-field"><span>カテゴリ<button type="button" class="payment-add-button" onclick="openExpenseOptionDialog(\'category\')" aria-label="カテゴリを追加">＋</button></span><select name="category"><option value="" selected>選択してください</option>'+categories.map(x=>'<option>'+x+'</option>').join('')+'</select></label>'+field('内容','note','text');if(expense)['date','accountingMonth','amount','company','category','note'].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.value=expense[name]??'';});const companyInput=fields.querySelector('[name="company"]'),categoryInput=fields.querySelector('[name="category"]');if(companyInput&&categoryInput)companyInput.addEventListener('change',()=>{const mapped=payeeCategory(companyInput.value);if(mapped&&[...categoryInput.options].some(option=>option.value===mapped))categoryInput.value=mapped;});}
 if(type==='dailyBatch'){ $('#dialogTitle').textContent='日別まとめ入力';fields.innerHTML=field('日付','date','date','daily-batch-date')+'<div class="batch-toolbar full"><span>キャストを選択して入力してください</span><button type="button" class="secondary-button" onclick="addBatchCastRow()">＋ キャストを追加</button></div><div class="daily-batch-list full" id="batchCastList">'+batchCastRow()+'</div>'; }
 if(type==='payrollDetails'){
   const cast=data.casts.find(item=>item.id===editingPayrollCastId);
   const [year,month]=String(data.month||'').split('-').map(Number);
   const daysInMonth=new Date(year,month,0).getDate();
   const monthly=cast?calcCast(cast):{};
   const money=value=>Number(value||0)?yen(value):'—';
   const count=value=>Number(value||0)?Number(value)+'本':'—';
   const metric=(label,value)=>'<div class="payroll-total-metric"><span>'+label+'</span><b>'+value+'</b></div>';
   const rate=Number(monthly.nominated||0)>0?Math.round(Number(monthly.gross||0)/Number(monthly.nominated||0)*100)+'%':'—';
   const average=Number(monthly.hours||0)>0?yen(Math.round(Number(monthly.gross||0)/Number(monthly.hours||0))):'—';
   const totals=[
     metric('本指名売上',money(monthly.nominated)),metric('場内 / 本指名 / 同伴 / 延長',count(monthly.area)+' / '+count(monthly.main)+' / '+count(monthly.companion)+' / '+count(monthly.extension)),
     metric('勤務日数',Number(monthly.days||0)+'日'),metric('勤務時間',Number(monthly.hours||0).toFixed(1)+'h'),metric('時間給',money(monthly.hourly)),
     metric('同伴B',money(monthly.companionBack)),metric('本指名B',money(monthly.mainBack)),metric('延長B',money(monthly.extensionBack)),
     metric('ドリンク（P含む）',money(monthly.drink)),metric('飾り物',money(monthly.decoration)),metric('ボトル・シャンパン',money(monthly.bottleChampagne)),
     metric('手当',money(monthly.allowance)),metric('バック計',money(monthly.back)),metric('消費税',money(monthly.consumptionTax)),metric('所得税',money(monthly.incomeTax)),
     metric('厚生費',money(monthly.welfare)),metric('引き物',money(monthly.pull)),metric('控除計',money(monthly.deductionTotal)),metric('日払い',money(monthly.advanceAmount)),
     metric('総支給額',money(monthly.gross)),metric('支給額（控除後）',money(monthly.payoutBeforeAdvance)),metric('支給額（日払い差引後）',money(monthly.payout)),metric('給率',rate),metric('平均時給',average)
   ].join('');
   const rows=Array.from({length:daysInMonth},(_,index)=>{
     const date=data.month+'-'+String(index+1).padStart(2,'0');
     const entries=data.dailyInputs.filter(item=>item.castId===editingPayrollCastId&&item.date===date);
     const calculated=entries.map(item=>calcDailyInput(item));
     const sum=key=>calculated.reduce((total,item)=>total+Number(item[key]||0),0);
     const raw=key=>entries.reduce((total,item)=>total+Number(item[key]||0),0);
     const has=entries.length>0;
     const hours=sum('hours'),attendance=entries.map(item=>item.attendance).filter(Boolean).join(' / ');
     const area=raw('areaNomination'),main=raw('mainCount'),companion=raw('companionCount'),extension=raw('mainExtension')+raw('companionExtension');
     const allowance=sum('allowance'),sales=raw('mainSales'),back=sum('back'),gross=sum('gross'),advance=sum('advance'),deduction=sum('deduction');
     const consumption=sum('consumptionTax'),income=sum('incomeTax'),welfare=sum('welfare'),pull=deduction+(hours>0?Number(data.settings.deductionPerShift||0):0);
     const totalDeduction=consumption+income+welfare+pull,payoutBefore=Math.max(0,gross-totalDeduction),payout=sum('payout');
     const dailyRate=sales>0?Math.round(gross/sales*100)+'%':'—',dailyAverage=hours>0?yen(Math.round(gross/hours)):'—';
     const cell=value=>'<td>'+((has&&value!==undefined&&value!==null)?value:'—')+'</td>';
     const edit=has?'<button type="button" class="text-button payroll-day-edit" onclick="editDailyInput(\''+entries[0].id+'\')">詳細・編集</button>':'—';
     return '<tr><td class="payroll-detail-date">'+dateJP(date)+'</td>'+cell(attendance||'—')+cell(money(sales))+cell(count(area)+' / '+count(main)+' / '+count(companion)+' / '+count(extension))+cell(hours>0?'1日':'—')+cell(hours?hours.toFixed(1)+'h':'—')+cell(money(sum('hourly')))+cell(money(sum('companionBack')))+cell(money(sum('mainBack')))+cell(money(sum('extensionBack')))+cell(money(sum('drink')))+cell(money(sum('decoration')))+cell(money(sum('bottleChampagne')))+cell(money(allowance))+cell(money(back))+cell(money(consumption))+cell(money(income))+cell(money(welfare))+cell(money(pull))+cell(money(totalDeduction))+cell(money(advance))+cell(money(gross))+cell(money(payoutBefore))+cell(money(payout))+cell(dailyRate)+cell(dailyAverage)+cell(edit)+'</tr>';
   }).join('');
   $('#dialogTitle').textContent=(cast?.name||'キャスト')+'｜'+year+'年'+month+'月の詳細';
   if(payrollDetailsEditButton){payrollDetailsEditButton.hidden=false;payrollDetailsEditButton.onclick=()=>openForm('payroll',editingPayrollCastId);}
   fields.innerHTML='<section class="payroll-month-detail full"><div class="payroll-month-summary payroll-month-summary-primary">'+metric('勤務日数',Number(monthly.days||0)+'日')+metric('勤務時間',Number(monthly.hours||0).toFixed(1)+'h')+metric('総支給額',money(monthly.gross))+metric('支給額',money(monthly.payout))+'</div><section class="payroll-month-totals"><h3>当月合計</h3><div class="payroll-total-grid">'+totals+'</div></section><div class="payroll-month-table-wrap"><table class="payroll-month-table"><thead><tr><th>日付</th><th>勤怠</th><th>本指名売上</th><th>場内 / 本指名 / 同伴 / 延長</th><th>勤務日数</th><th>勤務時間</th><th>時間給</th><th>同伴B</th><th>本指名B</th><th>延長B</th><th>ドリンク<br><small>P含む</small></th><th>飾り物</th><th>ボトル<br>シャンパン</th><th>手当</th><th>バック計</th><th>消費税</th><th>所得税</th><th>厚生費</th><th>引き物</th><th>控除計</th><th>日払い</th><th>総支給額</th><th>支給額<br><small>控除後</small></th><th>支給額<br><small>日払い差引後</small></th><th>給率</th><th>平均時給</th><th>操作</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>';
 } if(type==='dailyDetails'){
   const date=castId,entries=data.dailyInputs.filter(x=>x.date===date);
   const metric=(label,value,present)=>present?'<div class="daily-detail-metric"><span>'+label+'</span><strong>'+value+'</strong></div>':'';
   $('#dialogTitle').textContent=dateJP(date)+' の詳細';
   fields.innerHTML='<div class="daily-detail-list full"><div class="daily-detail-toolbar"><button type="button" class="secondary-button" onclick="addDailyCastForDate(\''+date+'\')">＋ キャストを追加</button></div>'+entries.map(x=>{
     const calc=calcDailyInput(x),nominationCount=Number(x.mainCount||0)+Number(x.companionCount||0);
     const metrics=[
       metric('実働',calc.hours+'h',Number(calc.hours||0)!==0),
       metric('勤怠',x.attendance||'—',Boolean(x.attendance)),
       metric('日払い',yen(calc.advance),Number(calc.advance||0)!==0),
       metric('引き物',yen(calc.deduction),Number(calc.deduction||0)!==0),
       metric('同伴B',yen(calc.companionBack),Number(calc.companionBack||0)!==0),
       metric('本指名B',yen(calc.mainBack),Number(calc.mainBack||0)!==0),
       metric('延長B',yen(calc.extensionBack),Number(calc.extensionBack||0)!==0),
       metric('ドリンク',yen(calc.drink),Number(calc.drink||0)!==0),
       metric('ボトル',yen(calc.bottleChampagne),Number(calc.bottleChampagne||0)!==0),
       metric('飾り物',yen(calc.decoration),Number(calc.decoration||0)!==0),
       metric('指名本数',nominationCount+'本',nominationCount!==0),
       metric('売上',yen(x.mainSales),Number(x.mainSales||0)!==0)
     ].join('');
     return '<article><div class="daily-detail-head"><b>'+castName(x.castId)+'</b><button type="button" class="text-button" onclick="editDailyInput(\''+x.id+'\')">詳細・編集</button></div>'+(metrics?'<div class="daily-detail-grid">'+metrics+'</div>':'')+'</article>';
   }).join('')+'</div>';
 }
  if(type==='dailyInput'){ const entry=data.dailyInputs.find(x=>x.id===editingDailyInputId);$('#dialogTitle').textContent=entry?'日別打込みを編集':'日別打込み';fields.innerHTML=field('日付','date','date','daily-edit-full')+'<label class="field daily-edit-full">キャスト<select name="castId">'+sortedCasts().map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label>'+timeField('出勤','startTime','daily-edit-third')+timeField('退勤','endTime','daily-edit-third')+optionalField('実働','hours','number','auto-hours daily-edit-third')+'<label class="field daily-edit-third"><span>勤怠</span><select name="attendance"><option value="">—</option><option value="遅刻">遅刻</option><option value="当欠">当欠</option><option value="無欠">無欠</option></select></label>'+optionalField('場内','areaNomination','number','daily-edit-fourth')+optionalField('日払い','advance','number','daily-edit-fourth')+optionalField('手当','allowance','number','daily-edit-fourth')+optionalField('引き物','deduction','number','daily-edit-fourth')+`<label class="field daily-edit-full"><span>本指名売上</span><input name="mainSales" class="calculator-input" type="text" inputmode="decimal" placeholder="例：9000+9000"></label>`+dailyBackDetail();if(entry)['date','castId','startTime','endTime','hours','attendance','advance','deduction','areaNomination','mainCount','allowance','companionCount','mainSales',...backInputKeys].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.value=(name==='startTime'||name==='endTime')?normalizeDailyTime(entry[name]):(entry[name]??'');});}
 if(type==='shiftBatch'){ $('#dialogTitle').textContent='キャスト別シフトを一括入力';const casts=sortedCasts().filter(c=>!c.hidden&&effectiveCastStatus(c)!=='退店');fields.innerHTML='<label class="field full">キャスト<select name="castId">'+casts.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label><div class="shift-batch-list full"></div>';fields.querySelector('[name="castId"]').onchange=renderShiftBatchRows;renderShiftBatchRows(); }
 if(type==='shopClosed'){
   $('#dialogTitle').textContent='店休をまとめて設定';
   const [year,month]=data.month.split('-').map(Number),count=new Date(year,month,0).getDate(),weekdays=['日','月','火','水','木','金','土'];
   const closedDates=new Set(data.dailyStatuses.filter(item=>item.status==='店休'&&String(item.date||'').startsWith(data.month+'-')).map(item=>item.date));
   fields.innerHTML='<div class="shop-closed-calendar full"><p>店休にする日を選択してください。選択済みの日をもう一度押すと解除になります。</p><div class="shop-closed-calendar-actions"><button type="button" class="text-button shop-closed-select-all">すべて選択</button><button type="button" class="text-button shop-closed-clear-all">すべて解除</button></div><div class="shop-closed-weekdays"><span>日</span><span>月</span><span>火</span><span>水</span><span>木</span><span>金</span><span>土</span></div><div class="shop-closed-days">'+Array.from({length:count},(_,i)=>{const day=i+1,date=data.month+'-'+String(day).padStart(2,'0'),weekday=weekdays[new Date(date+'T12:00:00').getDay()],closed=closedDates.has(date);return '<button type="button" class="shop-closed-day '+(closed?'is-selected':'')+'" data-shop-closed-date="'+date+'"><b>'+day+'</b><small>('+weekday+')</small></button>';}).join('')+'</div></div>';
   const dateButtons=[...fields.querySelectorAll('[data-shop-closed-date]')];
   dateButtons.forEach(button=>button.onclick=()=>button.classList.toggle('is-selected'));
   fields.querySelector('.shop-closed-select-all').onclick=()=>dateButtons.forEach(button=>button.classList.add('is-selected'));
   fields.querySelector('.shop-closed-clear-all').onclick=()=>dateButtons.forEach(button=>button.classList.remove('is-selected'));
 }
 if(type==='shift'){ $('#dialogTitle').textContent='勤務を登録';fields.innerHTML=field('勤務日','date','date')+'<label class="field">キャスト<select name="castId">'+sortedCasts().map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select></label>'+field('実働時間','hours','number')+field('日払い','advance','number');}
 if(type==='application'){ const application=data.applications.find(item=>item.id===editingApplicationId);$('#dialogTitle').textContent=application?'応募を編集':'応募を追加';fields.innerHTML=optionalField('応募日','applicationDate','date')+'<label class="field">ステータス<select name="status"><option value="" selected>選択してください</option><option>入店</option><option>不採用</option><option>返信無し</option><option>面接待ち</option><option>対応終了</option></select></label>'+'<label class="field">媒体<select name="media"><option value="" selected>選択してください</option>'+data.settings.applicationMedia.map(item=>'<option value="'+item+'">'+item+'</option>').join('')+'<option value="__new__">＋ 新しい媒体を追加</option><option value="__sort__">↕ 媒体の並び替え</option><option value="__manage__">✎ 既存の媒体を編集</option></select></label>'+'<label class="field">募集名<input name="_recruitmentEntryX9" type="search" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false"></label>'+'<label class="field">生年月日<input name="birthday" type="date"></label>'+optionalField('年齢','age','number')+optionalField('連絡先','phone','tel')+optionalField('Mail','email','email')+optionalField('面接希望日','preferredInterviewDate','date')+optionalField('面接確定日','confirmedInterviewDate','date')+optionalField('時間','interviewTime','time')+'<label class="field">リスケ<select name="reschedule"><option value="" selected>選択してください</option>'+[1,2,3,4,5].map(item=>'<option value="'+item+'">'+item+'</option>').join('')+'</select></label>'+'<label class="field full">備考<textarea name="note" rows="3"></textarea></label>';fields.querySelectorAll('input,textarea').forEach(input=>input.autocomplete='new-password');const birthday=fields.querySelector('[name="birthday"]'),age=fields.querySelector('[name="age"]'),media=fields.querySelector('[name="media"]');birthday.onchange=()=>{if(birthday.value)age.value=castAge(birthday.value).replace('歳','');};media.onchange=()=>{if(media.value==='__new__'){const name=(prompt('新しい媒体名を入力してください')||'').trim();if(!name){media.value='';return;}if(!data.settings.applicationMedia.includes(name))data.settings.applicationMedia.push(name);const option=document.createElement('option');option.value=name;option.textContent=name;media.insertBefore(option,media.querySelector('[value="__new__"]'));media.value=name;save();return;}if(media.value==='__sort__'){media.value='';window.openApplicationMediaOrder();return;}if(media.value!=='__manage__')return;const before=(prompt('編集する媒体名を入力してください\n\n登録済み：\n'+data.settings.applicationMedia.join('\n'))||'').trim();if(!before||!data.settings.applicationMedia.includes(before)){media.value='';return;}const after=(prompt('新しい媒体名を入力してください',before)||'').trim();if(!after||after===before){media.value=before;return;}if(data.settings.applicationMedia.includes(after)){alert('同じ媒体名がすでに登録されています。');media.value=before;return;}data.settings.applicationMedia=data.settings.applicationMedia.map(item=>item===before?after:item);data.applications.forEach(item=>{if(item.media===before)item.media=after;});const option=Array.from(media.options).find(item=>item.value===before);if(option){option.value=after;option.textContent=after;}media.value=after;save();};if(application){['applicationDate','media','birthday','age','phone','email','preferredInterviewDate','confirmedInterviewDate','interviewTime','reschedule','status','note'].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.value=application[name]??'';});const recruitmentInput=fields.querySelector('[name="_recruitmentEntryX9"]');if(recruitmentInput)recruitmentInput.value=application.recruitmentName??'';}else fields.querySelector('[name="applicationDate"]').value=businessDate();}
 if(type==='cast'){ const cast=data.casts.find(c=>c.id===editingCastId);$('#dialogTitle').textContent=cast?'キャストを編集・詳細':'キャストを追加';fields.innerHTML='<div class="cast-form-section full"><h3>ステータス</h3></div>'+'<label class="field">キャスト名<input name="_castEntryX9" type="search" autocomplete="one-time-code" autocorrect="off" autocapitalize="off" spellcheck="false"></label>'+'<label class="field">在籍状況<select name="status"><option>在籍</option><option>退店</option><option>体入</option><option>派遣</option></select></label>'+optionalField('入店日','joinedDate','date')+optionalField('退店日','leavingDate','date')+optionalField('氏名（姓）','castIdentityA')+optionalField('氏名（名）','castIdentityB')+'<label class="field birth-field">生年月日<input name="birthday" type="date"></label><label class="field age-field">年齢<input class="cast-age" name="age" type="number" min="0" max="120" inputmode="numeric" placeholder="年齢"></label>'+'<div class="cast-contact-row full">'+optionalField('連絡先','phone','tel')+optionalField('緊急連絡先','emergencyContact','tel')+optionalField('関係','emergencyRelation')+'</div>'+optionalField('住所','address')+optionalField('建物','building')+'<label class="field full">メモ<textarea name="memo" rows="3"></textarea></label><section class="cast-checklist full"><h3>確認項目</h3><label><input type="checkbox" name="termsSigned">規約サイン</label><label><input type="checkbox" name="photoSubmitted">写真</label><label><input type="checkbox" name="residenceCertificate">住民票</label></section>'+guaranteeProfileFields();form.autocomplete='off';fields.querySelectorAll('input:not([type="checkbox"]),textarea').forEach(input=>{input.autocomplete='new-password';input.setAttribute('autocorrect','off');input.setAttribute('autocapitalize','off');input.setAttribute('spellcheck','false');});
  const castNameInput=fields.querySelector('[name="_castEntryX9"]');
  if(castNameInput){castNameInput.autocomplete='new-password';castNameInput.setAttribute('data-no-history','true');}form.noValidate=true;if(cast){['status','joinedDate','leavingDate','birthday','age','phone','emergencyContact','emergencyRelation','address','building','memo'].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.value=cast[name]||(name==='status'?'在籍':'');});fields.querySelector('[name="_castEntryX9"]').value=cast.name||'';fields.querySelector('[name="castIdentityA"]').value=cast.lastName||'';fields.querySelector('[name="castIdentityB"]').value=cast.firstName||'';['termsSigned','photoSubmitted','residenceCertificate'].forEach(name=>{const input=fields.querySelector('[name="'+name+'"]');if(input)input.checked=Boolean(cast[name]);});const guarantee=cast.guarantee||{};['startDate','endDate','hourly',...guaranteeSettingKeys].forEach(key=>{const input=fields.querySelector('[name="guarantee_'+key+'"]');if(input)input.value=guarantee[key]??'';});fields.querySelector('[name="status"]').value=effectiveCastStatus(cast);}}if(type==='cast'){const leavingDate=fields.querySelector('[name="leavingDate"]'),status=fields.querySelector('[name="status"]'),birthday=fields.querySelector('[name="birthday"]'),age=fields.querySelector('.cast-age');const updateAge=()=>{if(!birthday.value)return;const birth=new Date(birthday.value+'T00:00:00'),today=new Date();let years=today.getFullYear()-birth.getFullYear();const beforeBirthday=today.getMonth()<birth.getMonth()||(today.getMonth()===birth.getMonth()&&today.getDate()<birth.getDate());if(beforeBirthday)years--;age.value=years;};leavingDate.onchange=()=>{if(leavingDate.value)status.value=dateKey(leavingDate.value)<=todayKey()?'退店':(status.value==='退店'?'在籍':status.value);};birthday.onchange=updateAge;updateAge();primarySave.type='button';primarySave.onclick=()=>{try{saveCastProfile();}catch(error){console.error('Cast save failed',error);alert('保存に失敗しました。\n'+(error?.message||''));}};}
 const now=new Date().toISOString().slice(0,10);if(!((type==='cast'&&editingCastId)||(type==='dailyInput'&&editingDailyInputId)||(type==='slip'&&editingSlipIndex!==null)||type==='application'))fields.querySelectorAll('input[type=date]').forEach(x=>{if(!(type==='cast'&&(x.name==='leavingDate'||x.name==='birthday'))&&!(type==='slip'&&x.name==='receivedDate'))x.value=now;});if(((type==='slip'&&editingSlipIndex===null)||type==='dailyInput'||type==='dailyBatch')&&!(type==='dailyInput'&&editingDailyInputId)){const dateField=fields.querySelector('input[name="date"]');if(dateField)dateField.value=businessDate();}if(type==='dailyInput'){bindDesktopTimePickers();bindWorkHours();calculateWorkHours();}if(type==='dailyBatch'&&castId){const batchDate=fields.querySelector('[name="date"]');if(batchDate)batchDate.value=castId;}if(type==='dailyBatch')bindBatchHours();showEntryDialog();markNegativeAmounts($('#entryDialog'));
}
['addSlip','dashboardAddSlip'].forEach(id=>{const button=$('#'+id);if(button)button.onclick=e=>{e.preventDefault();openForm('slip')};});
$('#sortSlipsDate').onclick=()=>{slipDateSort=slipDateSort==='asc'?'desc':'asc';renderSlips()};$('#sortDailyInputDate').onclick=()=>{dailyInputDateSort=dailyInputDateSort==='asc'?'desc':'asc';renderDailyInputs()};$('#addDailyInput').onclick=()=>openForm('dailyBatch');$('#addExpense').onclick=()=>openForm('expense');if($('#addShift'))$('#addShift').onclick=()=>openForm('shift');if($('#addShiftBatch'))$('#addShiftBatch').onclick=()=>openForm('shiftBatch');if($('#addShopClosed'))$('#addShopClosed').onclick=()=>openForm('shopClosed');if($('#addShopClosedDashboard'))$('#addShopClosedDashboard').onclick=()=>openForm('shopClosed');if($('#addCast'))$('#addCast').onclick=()=>openForm('cast');if($('#addCastProfile'))$('#addCastProfile').onclick=()=>openForm('cast');
function saveCastProfile(){
  const x=Object.fromEntries(new FormData(form));
  const guarantee={startDate:x.guarantee_startDate||'',endDate:x.guarantee_endDate||'',hourly:x.guarantee_hourly||''};
  guaranteeSettingKeys.forEach(key=>{guarantee[key]=x['guarantee_'+key]??'';});
  if(guarantee.startDate&&guarantee.endDate&&guarantee.endDate<guarantee.startDate){alert('保証の終了日は開始日以降にしてください。');return;}
  const hasGuarantee=Object.keys(guarantee).some(key=>!['startDate','endDate'].includes(key)&&guarantee[key]!==''&&guarantee[key]!==undefined);
  const profile={name:x._castEntryX9||'',status:x.status||'在籍',joinedDate:x.joinedDate||'',leavingDate:x.leavingDate||'',lastName:x.castIdentityA||'',firstName:x.castIdentityB||'',birthday:x.birthday||'',age:x.age||'',phone:x.phone||'',emergencyContact:x.emergencyContact||'',emergencyRelation:x.emergencyRelation||'',address:x.address||'',building:x.building||'',memo:x.memo||'',termsSigned:Boolean(x.termsSigned),photoSubmitted:Boolean(x.photoSubmitted),residenceCertificate:Boolean(x.residenceCertificate),guarantee:hasGuarantee?guarantee:null};
  const existing=data.casts.find(c=>c.id===editingCastId);
  if(existing)Object.assign(existing,profile);else data.casts.push({id:'c-'+Date.now(),hourly:0,...profile});
  save();
  render();
  dialog.close();
}
form.addEventListener('submit',e=>{if(e.submitter?.value==='cancel')return;e.preventDefault();const x=Object.fromEntries(new FormData(form));if(mode==='slip'){
  const manualTotal=Number(x.total||0);
  const payments=[...fields.querySelectorAll('.slip-payment-row')].map(row=>({method:row.querySelector('.slip-payment-method').value,amount:Number(row.querySelector('.slip-payment-amount').value||0)})).filter(item=>item.method);
  if(payments.length===1&&payments[0].amount<=0&&manualTotal>0)payments[0].amount=manualTotal;
  const paymentTotal=payments.reduce((sum,item)=>sum+Number(item.amount||0),0);
  const total=paymentTotal||manualTotal;
  const card=payments.reduce((sum,item)=>sum+(paymentMethodCategory(item.method)==='card'?Number(item.amount||0):0),0);
  const receivable=payments.reduce((sum,item)=>sum+(paymentMethodCategory(item.method)==='receivable'?Number(item.amount||0):0),0);
  const payment=payments.length>1?'併用':(payments[0]?.method||'');
  if(receivable>0&&x.receivedDate&&!window.confirm('入金完了日が '+x.receivedDate+' に登録されていますが、未収 '+yen(receivable)+' が残っています。\n決済方法の変更忘れがないか確認してください。このまま保存しますか？'))return;
  const id=[...fields.querySelectorAll('.slip-id-input')].map(input=>input.value.trim()).filter(Boolean).join(' / ');
  const record={id,date:x.date,receivedDate:x.receivedDate||'',customerName:x.customerName,total,card,receivable,payment,payments,receipt:Boolean(fields.querySelector('[name="receipt"]')?.checked),groups:1,guests:+x.guests,casts:[]};
  if(editingSlipIndex!==null&&data.slips[editingSlipIndex])Object.assign(data.slips[editingSlipIndex],record);else data.slips.push(record)
}if(mode==='dailyBatch'){fields.querySelectorAll('.daily-batch-row').forEach(row=>{const value=cls=>row.querySelector(cls).value||'';const start=batchRowTime(row,'start');const end=batchRowTime(row,'end');const hours=calculateBatchHours(row);const advance=value('.batch-advance'),deduction=value('.batch-deduction'),area=value('.batch-area'),main=value('.batch-main'),allowance=value('.batch-allowance'),companion=value('.batch-companion'),sales=calculatorNumber(value('.batch-sales')),attendance=value('.batch-attendance'),back={};backInputKeys.forEach(key=>back[key]=+value('.batch-'+key));if(!start&&!end&&!attendance&&!advance&&!deduction&&!area&&!main&&!allowance&&!companion&&!sales&&!backInputKeys.some(key=>back[key]))return;data.dailyInputs.push({id:'DI-'+Date.now()+'-'+row.dataset.castId,date:x.date,castId:row.querySelector('.batch-cast-select').value,startTime:start,endTime:end,hours:+hours,attendance,advance:+advance,deduction:+deduction,areaNomination:+area,mainCount:+main,allowance:+allowance,companionCount:+companion,mainSales:+sales,...back});});}if(mode==='dailyInput'){const record={id:editingDailyInputId||'DI-'+Date.now(),date:x.date,castId:x.castId,startTime:x.startTime,endTime:x.endTime,hours:+x.hours,attendance:x.attendance||data.dailyInputs.find(item=>item.id===editingDailyInputId)?.attendance||'',advance:+x.advance,deduction:+x.deduction,areaNomination:+x.areaNomination,mainCount:+x.mainCount,allowance:+x.allowance,companionCount:+x.companionCount,mainSales:calculatorNumber(x.mainSales),...Object.fromEntries(backInputKeys.map(key=>[key,+(x[key]||0)]))};const existing=data.dailyInputs.find(item=>item.id===editingDailyInputId);if(existing)Object.assign(existing,record);else data.dailyInputs.push(record)}if(mode==='payroll'){const cast=data.casts.find(item=>item.id===editingPayrollCastId);if(cast)cast.hourly=Math.max(0,Number(x.baseHourly||0));const keys=['nominated','area','main','companion','hours','hourly','back','allowance','deductions','payout'];const record={castId:editingPayrollCastId,month:data.month};keys.forEach(key=>record[key]=String(x[key]??'').trim());const index=data.payrollAdjustments.findIndex(item=>item.castId===editingPayrollCastId&&item.month===data.month);if(index>=0)data.payrollAdjustments[index]=record;else data.payrollAdjustments.push(record)}if(mode==='expense'){const record={id:editingExpenseId||'E-'+Date.now(),date:x.date,accountingMonth:x.accountingMonth||'',category:x.category,company:x.company,note:x.note,amount:+x.amount};const existing=data.expenses.find(item=>item.id===editingExpenseId);if(existing)Object.assign(existing,record);else data.expenses.push(record)}if(mode==='shiftBatch'){const castId=x.castId;fields.querySelectorAll('.shift-batch-row').forEach(row=>{const value=row.querySelector('.shift-batch-value').value.trim();if(!value)return;const date=row.dataset.date,numeric=Number(value),existing=data.shifts.find(item=>item.date===date&&item.castId===castId);const record={date,castId,hours:Number.isFinite(numeric)&&numeric>=0?numeric:0,schedule:value,advance:existing?.advance||0};if(existing)Object.assign(existing,record);else data.shifts.push(record);});}if(mode==='shopClosed'){
   const prefix=data.month+'-',selectedDates=new Set([...fields.querySelectorAll('[data-shop-closed-date].is-selected')].map(button=>button.dataset.shopClosedDate));
   const monthDates=dailyRows().map(row=>row.date);
   monthDates.forEach(date=>{const existing=data.dailyStatuses.find(item=>item.date===date);if(selectedDates.has(date)){if(existing)existing.status='店休';else data.dailyStatuses.push({date,status:'店休'});}else if(existing?.status==='店休'){data.dailyStatuses=data.dailyStatuses.filter(item=>item!==existing);}});
 }if(mode==='shift'){data.shifts.push({date:x.date,castId:x.castId,hours:+x.hours,advance:+x.advance})}if(mode==='application'){const record={applicationDate:x.applicationDate,media:x.media,recruitmentName:x._recruitmentEntryX9,birthday:x.birthday,age:x.age,phone:x.phone,email:x.email,preferredInterviewDate:x.preferredInterviewDate,confirmedInterviewDate:x.confirmedInterviewDate,interviewTime:x.interviewTime,reschedule:x.reschedule,status:x.status,note:x.note};const existing=data.applications.find(item=>item.id===editingApplicationId);if(existing)Object.assign(existing,record);else data.applications.push({id:'A-'+Date.now(),...record})}if(mode==='cast'){const profile={name:x._castEntryX9,status:x.status,joinedDate:x.joinedDate,leavingDate:x.leavingDate,lastName:x.castIdentityA,firstName:x.castIdentityB,birthday:x.birthday,age:x.age,phone:x.phone,emergencyContact:x.emergencyContact,emergencyRelation:x.emergencyRelation,address:x.address,building:x.building,memo:x.memo,termsSigned:Boolean(x.termsSigned),photoSubmitted:Boolean(x.photoSubmitted),residenceCertificate:Boolean(x.residenceCertificate)};const existing=data.casts.find(c=>c.id===editingCastId);if(existing)Object.assign(existing,profile);else data.casts.push({id:'c-'+Date.now(),hourly:0,...profile})}save();render();dialog.close();});
window.editSlip=index=>openForm('slip',index);window.editExpense=id=>openForm('expense',id);window.deleteEditingExpense=()=>{if(!editingExpenseId)return;if(!confirm('この支出を削除しますか？'))return;data.expenses=data.expenses.filter(item=>item.id!==editingExpenseId);save();render();closeEntryDialog();};window.deleteEditingDailyInput=()=>{if(!editingDailyInputId)return;if(!confirm('この日別打込みを削除しますか？'))return;data.dailyInputs=data.dailyInputs.filter(item=>item.id!==editingDailyInputId);save();render();closeEntryDialog();};window.deleteEditingSlip=()=>{if(editingSlipIndex===null||!data.slips[editingSlipIndex])return;if(!confirm('この伝票を削除しますか？'))return;data.slips.splice(editingSlipIndex,1);save();render();closeEntryDialog();};window.deleteEditingApplication=()=>{if(!editingApplicationId)return;if(!confirm('この応募情報を削除しますか？'))return;data.applications=data.applications.filter(item=>item.id!==editingApplicationId);save();render();closeEntryDialog();};window.removeItem=(type,id)=>{if(!confirm('このデータを削除しますか？'))return;data[type]=data[type].filter(x=>x.id!==id);save();render()};window.removeCast=async id=>{if(!confirm('キャストを削除しますか？ 関連する過去データは残ります。'))return;const previous=clonePayload(data);data.casts=data.casts.filter(x=>x.id!==id);save();if(await commitCastDeletion(previous,id))render();};window.deleteEditingCast=async()=>{if(!editingCastId)return;if(!confirm('このキャストを削除しますか？ 関連する過去データは残ります。'))return;const previous=clonePayload(data);data.casts=data.casts.filter(x=>x.id!==editingCastId);save();if(await commitCastDeletion(previous,editingCastId)){render();closeEntryDialog();}};
$('#saveSettings').onclick=()=>{document.querySelectorAll('[data-setting]').forEach(x=>data.settings[x.dataset.setting]=Number(x.value));save();render();alert('計算設定を保存しました。')};
$('#menuButton').onclick=()=>{$('#sidebar').classList.add('open');$('#overlay').classList.add('show')};function closeMenu(){$('#sidebar').classList.remove('open');$('#overlay').classList.remove('show')}$('#overlay').onclick=closeMenu;
const now=new Date();$('#todayLabel').textContent=now.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'short'});
function showAuthMessage(message){$('#authMessage').textContent=message;}
async function initializeAuth(){
  if(!supabaseClient){showAuthMessage('認証サービスを読み込めませんでした。');return;}
  try{
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(session) await setSignedIn(session.user);
  }catch(error){console.error('Session check failed',error);}
  supabaseClient.auth.onAuthStateChange(async(_event,session)=>{
    if(session&&(!cloudUser||cloudUser.id!==session.user.id)) await setSignedIn(session.user);
    if(!session){cloudUser=null;cloudLoaded=false;lastCloudScore=0;authLoading=false;$('#authScreen').classList.remove('hidden');}
  });
}
async function setSignedIn(user){
  if(authLoading) return false;
  authLoading=true;
  cloudUser=user;
  try{
    const loaded=await loadFromCloud();
    if(loaded){$('#authScreen').classList.add('hidden');showAuthMessage('');return true;}
    cloudUser=null;
    $('#authScreen').classList.remove('hidden');
    return false;
  }catch(error){
    console.error('Signed-in setup failed',error);
    cloudUser=null;
    $('#authScreen').classList.remove('hidden');
    showAuthMessage('ログイン後の読み込みに失敗しました。もう一度お試しください。');
    return false;
  }finally{authLoading=false;}
}
$('#authForm').addEventListener('submit',async e=>{
  e.preventDefault();
  if(authLoading)return;
  authLoading=true;
  showAuthMessage('ログインしています…');
  try{
    const result=await Promise.race([
      supabaseClient.auth.signInWithPassword({email:$('#authEmail').value.trim(),password:$('#authPassword').value}),
      new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),15000))
    ]);
    if(result?.timeout){showAuthMessage('ログインに時間がかかっています。通信を確認して再度お試しください。');return;}
    if(result?.error){showAuthMessage('ログインできませんでした。メールアドレスとパスワードを確認してください。');return;}
    if(result?.data?.session){
      cloudUser=result.data.session.user;
      const loaded=await loadFromCloud();
      if(loaded){$('#authScreen').classList.add('hidden');showAuthMessage('');}
      else {cloudUser=null;$('#authScreen').classList.remove('hidden');}
      return;
    }
    showAuthMessage('ログイン状態を確認できませんでした。もう一度お試しください。');
  }catch(error){
    console.error('Sign in failed',error);
    showAuthMessage('ログイン通信に失敗しました。通信を確認してください。');
  }finally{
    authLoading=false;
  }
});
$('#signUpButton').onclick=async()=>{const email=$('#authEmail').value,password=$('#authPassword').value;if(!email||!password){showAuthMessage('メールアドレスと6文字以上のパスワードを入力してください。');return;}showAuthMessage('アカウントを作成しています…');const {data:result,error}=await supabaseClient.auth.signUp({email,password});if(error)showAuthMessage(error.message);else if(!result.session)showAuthMessage('確認メールを送信しました。メール内のリンクを開いてください。');};
$('#logoutButton').onclick=()=>supabaseClient.auth.signOut();
initializeAuth();
