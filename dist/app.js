'use strict';
const M = window.SolventModel;
const $ = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (value, decimals = 0) => Number.isFinite(value) ? (Math.round((value + Number.EPSILON)*10**decimals)/10**decimals).toLocaleString('en-US', {minimumFractionDigits:decimals,maximumFractionDigits:decimals}) : '—';
const readNumber = element => element.value.trim() === '' ? null : Number(element.value);
const KEY = 'solvent-t-scenarios-v1';
function normalizeSnapshot(snapshot) {
  const s=M.clone(snapshot);
  const sources={Case:'Reference',Asumsi:'Assumption','Hasil uji':'Test result'};
  const names={'Skenario awal':'Baseline blend','Skenario kustom':'Custom blend','Porsi SH dikurangi':'Reduced super-heavy','SH lebih bersih':'Cleaner super-heavy'};
  s.name=names[s.name]||s.name;
  for(const k of ['ratioSource','capacitySource','efficiencySource','bufferSource','stockSource']) s[k]=sources[s[k]]||s[k]||'Assumption';
  const suppliers={'Cargo Heavy — data case':'Heavy reference cargo','Cargo Super-heavy — data case':'Super-heavy reference cargo','Cargo Light — data case':'Light reference cargo','Supplier SH lebih bersih — asumsi':'Cleaner SH supplier — estimate'};
  s.cargo.forEach((c,i)=>{c.type=M.base.cargo[i].type;c.code=M.base.cargo[i].code;c.supplier=suppliers[c.supplier]||c.supplier;for(const k of ['saltSource','bswSource']) c[k]=sources[c[k]]||c[k]||'Assumption';});
  return s;
}
let state = M.preset(0), saved = [], showSaved = false, activeTab = 'blend', selectedDemo = 0, selectedSaved = null, toastTimer;
try {const data=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(data)) saved=data.filter(x=>x && typeof x.id==='string' && M.validSnapshot(x.state)).map(x=>({...x,state:normalizeSnapshot(x.state)}));} catch {}
const sourceOptions = selected => ['Reference','Assumption','Test result'].map(x=>`<option${x===selected?' selected':''}>${x}</option>`).join('');
const codes = ['H','SH','L'], colors = ['var(--h)','var(--sh)','var(--l)'];
function toast(message) {clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,4300);}
function invalidateVerification() {state.verification=M.clone(M.base.verification);}
function markEdited(resetVerification=true) {state.name='Custom blend';selectedDemo=null;selectedSaved=null;if(resetVerification) invalidateVerification();}
function renderInputs() {
  $('ratio-controls').innerHTML=state.ratios.map((v,i)=>`<div><label class="ratio-label" for="ratio-${i}"><span class="dot ${codes[i].toLowerCase()}"></span>${state.cargo[i].type}</label><div class="ratio-number"><input id="ratio-${i}" type="number" min="0" max="100" step="0.1" value="${v}" data-ratio="${i}" aria-label="Volume share for ${state.cargo[i].type}"><span>%</span></div><input id="slider-${i}" type="range" min="0" max="100" step="0.1" value="${v}" data-slider="${i}" aria-label="Volume share slider for ${state.cargo[i].type}"></div>`).join('');
  $('cargo-rows').innerHTML=state.cargo.map((c,i)=>`<tr><td><label class="cargo-type" for="supplier-${i}"><span class="dot ${codes[i].toLowerCase()}"></span>${c.type} <small>${c.code}</small></label><input id="supplier-${i}" class="cargo-supplier" type="text" value="${escapeHtml(c.supplier)}" data-cargo="${i}" data-field="supplier" aria-label="Cargo or supplier for ${c.type}" maxlength="120"></td>${['salt','bsw'].map(k=>`<td><input class="cargo-number" id="${k}-${i}" type="number" min="0" ${k==='bsw'?'max="100"':''} step="0.01" value="${c[k]}" data-cargo="${i}" data-field="${k}" aria-label="${k==='salt'?'Salt':'BS&W'} ${c.type}"><select class="cargo-source" id="${k}-source-${i}" data-cargo="${i}" data-field="${k}Source" aria-label="Source for ${k==='salt'?'salt':'BS&W'} ${c.type}">${sourceOptions(c[k+'Source'])}</select></td>`).join('')}</tr>`).join('');
  for(const id of ['capacity','efficiency','buffer','stock','schedule','backup']) $(id).value=state[id]??'';
  $('stock-age').value=state.stockAge||'';$('stock-source').value=state.stockSource||'Assumption';
}
function render() {
  const r=M.calculate(state), valid=r.valid;
  $('active-name').textContent=state.name;
  const sourceSet=new Set([state.ratioSource,state.capacitySource,state.efficiencySource,...state.cargo.flatMap(c=>[c.saltSource,c.bswSource])]);
  $('scenario-source').textContent=[...sourceSet].join(' + ');
  $('validation').hidden=valid;
  $('validation').innerHTML=valid?'':`<strong>Check the inputs before using the results.</strong><ul>${r.errors.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
  const total=state.ratios.reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);
  $('total-badge').textContent=`Total ${fmt(total,Math.abs(total-Math.round(total))>1e-6?1:0)}%`;
  $('total-badge').className='status '+(Math.abs(total-100)<1e-6?'success':'warning');
  $('blend-bar').innerHTML=state.ratios.map((v,i)=>`<span style="width:${Math.max(0,Math.min(100,Number(v)||0))}%;background:${colors[i]}"></span>`).join('');
  $('blend-bar').setAttribute('aria-label',`Blend H ${state.ratios[0]}%, SH ${state.ratios[1]}%, L ${state.ratios[2]}%`);
  $('ratio-source').textContent=state.ratioSource;
  for(const id of ['capacity','efficiency','buffer']) $(id+'-source').textContent=state[id+'Source'];
  $('supply-capacity-source').textContent=state.capacitySource;
  for(const [id,value,decimals] of [['inlet',r.inlet,2],['outlet',r.outlet,3],['bsw',r.bsw,3],['target',r.target,0],['coverage',r.coverage,2],['shortage',r.shortage,0]]) $(id).textContent=fmt(value,decimals);
  $('outlet-card').className='summary-panel metric'+(valid?(r.saltPass?' success':' warning'):'');
  $('salt-chip').textContent=valid?(r.saltPass?'Meets salt threshold':'Above limit'):'Invalid inputs';
  $('salt-chip').className='status '+(valid?(r.saltPass?'success':'warning'):'neutral');
  $('result-symbol').textContent=valid?(r.saltPass?'✓':'!'):'—';$('result-symbol').className='result-symbol'+(valid&&r.saltPass?' pass':'');
  $('result-message').className='result-message'+(valid&&r.saltPass?' pass':'');
  $('result-message').innerHTML=!valid?'<strong>Complete the inputs to calculate.</strong>Check all values and make sure volume shares total 100%.':r.saltPass?`<strong>Meets the salt screening threshold.</strong>Predicted outlet salt is ${fmt(r.outlet,3)} PTB, below the &lt;2 PTB limit. Continue with blend verification.`:`<strong>Predicted salt exceeds the limit.</strong>Outlet salt is ${fmt(r.outlet,3)} PTB. Compare cargo quality or composition to reach &lt;2 PTB.`;
  $('process-inlet').innerHTML=`${fmt(r.inlet,2)} <small>PTB</small>`;$('process-outlet').innerHTML=`${fmt(r.outlet,3)} <small>PTB</small>`;$('process-efficiency').innerHTML=`${fmt(state.efficiency,Number.isInteger(state.efficiency)?0:1)}<small>%</small>`;
  const v=valid?r.verification:'pending';$('verification-chip').textContent=v==='pass'?'Test results pass':v==='fail'?'Test results fail':'Verification required';$('verification-chip').className='status '+(v==='pass'?'success':v==='fail'?'danger':'neutral');
  $('daily-peek').innerHTML=state.cargo.map((c,i)=>`<div class="daily-peek-row"><span><span class="dot ${codes[i].toLowerCase()}"></span>${c.type}</span><strong>${fmt(r.daily?.[i])} <small>bbl/day</small></strong></div>`).join('');
  $('supply-blend').textContent=`H / SH / L = ${state.ratios.map(x=>fmt(x,Number.isInteger(x)?0:1)).join(' / ')}% · Capacity ${fmt(state.capacity)} bbl/day · ${state.ratioSource}`;
  $('target-detail').innerHTML=`${valid?fmt(r.daily[2]):'—'} bbl/day × ${fmt(state.buffer,Number.isInteger(state.buffer)?0:1)} days <span class="source-badge">Calculated · ${escapeHtml(state.bufferSource)}</span>`;
  $('coverage-detail').textContent=!valid?'Waiting for valid inputs.':r.daily[2]===0?'Not calculated: daily light demand is 0 bbl/day.':state.stock===null?'Enter usable light inventory.':`${fmt(state.stock)} bbl ÷ ${fmt(r.daily[2])} bbl/day · ${state.stockSource}`;
  $('stock-chip').textContent=!valid?'Invalid inputs':state.stock===null?'Inventory not entered':r.shortage>0?'Below target':'Target covered';
  $('stock-chip').className='status '+(!valid||state.stock===null?'neutral':r.shortage>0?'warning':'success');
  $('inventory-guidance').textContent=!valid?'Complete the inputs before planning inventory.':state.stock===null?'Enter usable inventory to calculate coverage and additional supply.':r.shortage>0?`Target ${fmt(r.target)} bbl − usable inventory ${fmt(state.stock)} bbl.`:'Usable inventory meets the selected buffer target.';
  $('shortage-card').className='summary-panel metric'+(valid&&state.stock!==null?(r.shortage>0?' warning':' success'):'');
  $('daily-full').innerHTML=state.cargo.map((c,i)=>`<div class="daily-full-row"><div><span class="dot ${codes[i].toLowerCase()}"></span>${c.type}<span class="source-badge">${valid?fmt(state.ratios[i],Number.isInteger(state.ratios[i])?0:1):'—'}% · ${escapeHtml(state.ratioSource)}</span></div><strong>${fmt(r.daily?.[i])} <small>bbl/day</small></strong><div class="daily-bar"><span style="width:${valid?state.ratios[i]:0}%;background:${colors[i]}"></span></div></div>`).join('');
  $('daily-total').textContent=`${valid?fmt(state.capacity):'—'} bbl/day`;
  const progress=valid&&state.stock!==null?(r.target>0?Math.min(100,state.stock/r.target*100):100):0;
  $('stock-track').innerHTML=`<div class="track-labels"><span>Usable inventory <span class="source-badge">${escapeHtml(state.stockSource)}</span></span><span>Buffer target <span class="source-badge">Calculated</span></span></div><div class="track-line"><span style="width:${progress}%"></span></div><div class="track-labels"><strong>${state.stock!==null?fmt(state.stock):'Not entered'}${state.stock!==null?' bbl':''}</strong><strong>${fmt(r.target)} bbl</strong></div>`;
  $('save').disabled=!valid;$('export').disabled=!valid;$('verify-open').disabled=!valid;
  renderComparison();
  renderCharts();
}
function renderCharts(){if(window.SolventCharts)window.SolventCharts.render(state,M.calculate(state),activeTab,index=>{useState(M.preset(index),index);toast('Scenario loaded.');});}
function renderComparison() {
  $('show-demo').classList.toggle('selected',!showSaved);$('show-saved').classList.toggle('selected',showSaved);$('show-demo').setAttribute('aria-pressed',String(!showSaved));$('show-saved').setAttribute('aria-pressed',String(showSaved));$('saved-count').textContent=saved.length;
  const items=showSaved?saved.map(x=>({s:x.state,id:x.id})): [0,1,2].map(i=>({s:M.preset(i),id:i}));
  $('comparison-rows').innerHTML=items.map(({s,id})=>{const r=M.calculate(s),selected=showSaved?selectedSaved===id:selectedDemo===id;return `<tr class="${selected?'selected-row':''}"><td>${escapeHtml(s.name)} <span class="source-badge">${showSaved?'Saved':id===0?'Reference':'Assumption'}</span></td><td>${s.ratios.map(x=>fmt(x,Number.isInteger(x)?0:1)).join(' / ')}</td><td>${fmt(r.inlet,2)}</td><td>${fmt(r.outlet,3)}</td><td><span class="status ${r.saltPass?'success':'warning'}">${r.saltPass?'Passes':'Above limit'}</span></td><td><button class="text-button" data-load="${escapeHtml(id)}" ${selected?'disabled':''}>${selected?'Selected':'Load'} ${selected?'✓':'↗'}</button>${showSaved?`<button class="delete-scenario" data-delete="${escapeHtml(id)}" aria-label="Delete scenario ${escapeHtml(s.name)}" title="Delete scenario">×</button>`:''}</td></tr>`;}).join('');
  $('saved-empty').hidden=!showSaved||saved.length>0;
  $('comparison-foot').innerHTML=showSaved?'Scenarios are stored in this browser with their inputs, data sources, inventory, and verification records.':'97% desalter efficiency for all reference scenarios <span class="source-badge">Assumption</span> · Cleaner SH: salt 70 PTB, BS&W 1.50%. TAN and metals are unchanged in this scenario.';
}
function useState(s, demo=null, id=null) {state=normalizeSnapshot(s);selectedDemo=demo;selectedSaved=id;renderInputs();render();}
function switchTab(tab) {activeTab=tab;for(const t of ['blend','supply']){const selected=t===tab;$('tab-'+t).classList.toggle('active',selected);$('tab-'+t).setAttribute('aria-selected',String(selected));$('tab-'+t).tabIndex=selected?0:-1;$('panel-'+t).hidden=!selected;}$('page-title').textContent=tab==='blend'?'Crude blending':'Supply & inventory';$('page-subtitle').textContent=tab==='blend'?'Crude quality, desalting, and supply requirements.':'Daily demand, inventory targets, and buffer coverage.';if(matchMedia('(max-width:760px)').matches){document.body.classList.remove('nav-open');$('sidebar-toggle').setAttribute('aria-expanded','false');}renderCharts();window.scrollTo({top:0,behavior:'instant'});}
document.querySelector('.tabs').addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();switchTab(e.key==='Home'?'blend':e.key==='End'?'supply':activeTab==='blend'?'supply':'blend');$('tab-'+activeTab).focus();}});
$('sidebar-toggle').onclick=()=>{const mobile=matchMedia('(max-width:760px)').matches;document.body.classList.toggle(mobile?'nav-open':'nav-collapsed');const expanded=mobile?document.body.classList.contains('nav-open'):!document.body.classList.contains('nav-collapsed');$('sidebar-toggle').setAttribute('aria-expanded',String(expanded));$('sidebar-toggle').setAttribute('aria-label',expanded?'Collapse navigation':'Open navigation');};
function updateNavigation(){const mobile=matchMedia('(max-width:760px)').matches,expanded=mobile?document.body.classList.contains('nav-open'):!document.body.classList.contains('nav-collapsed');$('sidebar-toggle').setAttribute('aria-expanded',String(expanded));$('sidebar-toggle').setAttribute('aria-label',expanded?'Collapse navigation':'Open navigation');}
window.addEventListener('resize',updateNavigation);updateNavigation();
$('tab-blend').onclick=() =>switchTab('blend');$('tab-supply').onclick=()=>switchTab('supply');$('go-supply').onclick=()=>switchTab('supply');$('go-blend').onclick=()=>switchTab('blend');
$('ratio-controls').addEventListener('input',e=>{const el=e.target, isSlider=el.dataset.slider!==undefined, index=Number(isSlider?el.dataset.slider:el.dataset.ratio);if(!Number.isInteger(index))return;state.ratios[index]=readNumber(el);(isSlider?$('ratio-'+index):$('slider-'+index)).value=el.value;state.ratioSource='Assumption';markEdited();render();});
$('cargo-rows').addEventListener('input',e=>{const el=e.target,i=Number(el.dataset.cargo),k=el.dataset.field;if(!k||!Number.isInteger(i))return;state.cargo[i][k]=['salt','bsw'].includes(k)?readNumber(el):el.value;if(['salt','bsw'].includes(k)){state.cargo[i][k+'Source']='Assumption';$(k+'-source-'+i).value='Assumption';}markEdited();render();});
for(const id of ['capacity','efficiency','buffer','stock']) $(id).addEventListener('input',()=>{state[id]=readNumber($(id));state[id+'Source']='Assumption';if(id==='stock') $('stock-source').value='Assumption';markEdited(['capacity','efficiency'].includes(id));render();});
$('stock-source').onchange=()=>{state.stockSource=$('stock-source').value;markEdited(false);render();};
for(const [id,key] of [['schedule','schedule'],['backup','backup'],['stock-age','stockAge']]) $(id).oninput=()=>{state[key]=$(id).value;markEdited(false);render();};
$('balance').onclick=()=>{const total=state.ratios.reduce((a,b)=>a+(Number.isFinite(b)&&b>=0?b:0),0);if(!total){toast('Enter at least one volume share above 0%.');return;}const first=Math.round(Math.max(0,state.ratios[0]||0)/total*1000)/10,second=Math.min(Math.round((100-first)*10)/10,Math.round(Math.max(0,state.ratios[1]||0)/total*1000)/10);state.ratios=[first,second,Math.round((100-first-second)*10)/10];state.ratioSource='Assumption';markEdited();renderInputs();render();};
$('reset').onclick=()=>{useState(M.preset(0),0);toast('Baseline blend loaded.');};
$('show-demo').onclick=()=>{showSaved=false;renderComparison();};$('show-saved').onclick=()=>{showSaved=true;renderComparison();};
$('comparison-rows').onclick=e=>{const load=e.target.closest('[data-load]'),del=e.target.closest('[data-delete]');if(load){if(showSaved){const item=saved.find(x=>x.id===load.dataset.load);if(item)useState(item.state,null,item.id);}else useState(M.preset(Number(load.dataset.load)),Number(load.dataset.load));toast('Scenario loaded.');}if(del){const next=saved.filter(x=>x.id!==del.dataset.delete);try{localStorage.setItem(KEY,JSON.stringify(next));saved=next;renderComparison();toast('Scenario deleted from this browser.');}catch{toast('Browser storage is unavailable. The scenario has not been deleted.');}}};
function openMethod(){$('method-dialog').showModal();}$('method-open').onclick=openMethod;$('footer-method').onclick=openMethod;
document.querySelectorAll('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('save').onclick=()=>{$('scenario-name').value=state.name==='Custom blend'?'':state.name;$('save-error').textContent='';$('save-dialog').showModal();};
$('save-form').addEventListener('submit',e=>{if(e.submitter?.value!=='save')return;e.preventDefault();const name=$('scenario-name').value.trim();if(!name){$('save-error').textContent='Enter a scenario name.';return;}if(!M.calculate(state).valid){$('save-error').textContent='Correct the inputs before saving.';return;}const snapshot=M.clone(state);snapshot.name=name;const id=globalThis.crypto?.randomUUID?crypto.randomUUID():Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);const item={id,state:snapshot,createdAt:new Date().toISOString()};try{localStorage.setItem(KEY,JSON.stringify([...saved,item]));saved.push(item);state.name=name;selectedSaved=id;selectedDemo=null;showSaved=true;$('save-dialog').close();render();toast('Scenario saved in this browser.');}catch{$('save-error').textContent='Browser storage is unavailable or full. Export CSV to keep a summary.';}});
$('verify-open').onclick=()=>{for(const k of ['compatibility','bsw','tan','metal','notes']) $('verify-'+k).value=state.verification[k]??'';$('verify-error').textContent='';$('verify-dialog').showModal();};
$('verify-save').onclick=()=>{const bsw=readNumber($('verify-bsw'));if(bsw!==null&&(!Number.isFinite(bsw)||bsw<0||bsw>100)){$('verify-error').textContent='BS&W outlet must be between 0% and 100%.';return;}markEdited(false);state.verification={compatibility:$('verify-compatibility').value,bsw,tan:$('verify-tan').value,metal:$('verify-metal').value,notes:$('verify-notes').value};$('verify-dialog').close();render();toast('Verification applied. Save the scenario to keep this record in your browser.');};
function csvCell(value) {let s=value===null||value===undefined?'':String(value);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
$('export').onclick=()=>{
  const headers=['Group','Scenario','H (%)','SH (%)','L (%)','Volume share source','Capacity (bbl/day)','Capacity source','Efficiency (%)','Efficiency source',...state.cargo.flatMap(c=>[c.code+' supplier',c.code+' salt (PTB)',c.code+' salt source',c.code+' BS&W (%)',c.code+' BS&W source']),'Inlet salt (PTB)','Inlet BS&W (%)','Predicted outlet salt (PTB)','Salt screening <2 PTB','Blend verification','H (bbl/day)','SH (bbl/day)','L (bbl/day)','Buffer (days)','Buffer source','Usable inventory (bbl)','Inventory source','Light target (bbl)','Coverage (days)','Additional light (bbl)','Shipment schedule','Backup supplier','Inventory age','Compatibility test','Outlet BS&W test (%)','TAN test','Metals test','Verification reference'];
  const items=[{group:'Active',s:state},...[0,1,2].map(i=>({group:'Reference scenarios',s:M.preset(i)})),...saved.map(x=>({group:'Saved',s:x.state}))];
  const rows=items.map(({group,s})=>{const r=M.calculate(s),v=s.verification||{};return [group,s.name,...s.ratios,s.ratioSource,s.capacity,s.capacitySource,s.efficiency,s.efficiencySource,...s.cargo.flatMap(c=>[c.supplier,c.salt,c.saltSource,c.bsw,c.bswSource]),r.inlet,r.bsw,r.outlet,r.saltPass?'Meets salt threshold':'Above limit',r.verification==='pass'?'Test results pass':r.verification==='fail'?'Test results fail':'Verification required',...r.daily,s.buffer,s.bufferSource,s.stock,s.stockSource,r.target,r.coverage,r.shortage,s.schedule,s.backup,s.stockAge,v.compatibility,v.bsw,v.tan,v.metal,v.notes];});
  const numericValue=v=>typeof v==='number'?String(Number(v.toPrecision(12))):v;
  const csv='\ufeff'+[headers,...rows].map(row=>row.map(x=>csvCell(numericValue(x))).join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download='SOLVENT_T_scenario_summary.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Scenario summary exported to CSV.');
};
renderInputs();render();
