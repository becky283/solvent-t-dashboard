(function (root, factory) {
  const model = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  else root.SolventModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const base = {
    name: 'Baseline blend', ratios: [50, 40, 10], ratioSource: 'Reference', capacity: 300000,
    capacitySource: 'Reference', efficiency: 97, efficiencySource: 'Assumption', buffer: 5,
    bufferSource: 'Assumption', stock: null, stockSource: 'Assumption',
    cargo: [
      {type: 'Heavy', code: 'H', supplier: 'Heavy reference cargo', salt: 42, bsw: 1.2, saltSource: 'Reference', bswSource: 'Reference'},
      {type: 'Super-heavy', code: 'SH', supplier: 'Super-heavy reference cargo', salt: 115, bsw: 3.8, saltSource: 'Reference', bswSource: 'Reference'},
      {type: 'Light', code: 'L', supplier: 'Light reference cargo', salt: 8.5, bsw: 0.15, saltSource: 'Reference', bswSource: 'Reference'}
    ],
    schedule: '', backup: '', stockAge: '',
    verification: {compatibility: 'pending', bsw: null, tan: 'pending', metal: 'pending', notes: ''}
  };
  const finiteNonnegative = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  function calculate(s) {
    const errors = [];
    if (!s || !Array.isArray(s.ratios) || s.ratios.length !== 3 || !Array.isArray(s.cargo) || s.cargo.length !== 3) return {valid: false, errors: ['Scenario data is incomplete.']};
    if (!s.ratios.every(x => finiteNonnegative(x) && x <= 100)) errors.push('Volume shares must be between 0% and 100%.');
    const total = s.ratios.reduce((a,b) => a+b, 0);
    if (Math.abs(total-100) > 0.000001) errors.push('H + SH + L must total exactly 100%.');
    if (!finiteNonnegative(s.capacity)) errors.push('Enter a nonnegative processing capacity.');
    if (!finiteNonnegative(s.efficiency) || s.efficiency >= 100) errors.push('Efficiency must be at least 0% and below 100%.');
    if (!finiteNonnegative(s.buffer)) errors.push('Enter a nonnegative buffer period.');
    if (s.stock !== null && !finiteNonnegative(s.stock)) errors.push('Light inventory cannot be negative.');
    s.cargo.forEach(c => {
      if (!finiteNonnegative(c.salt)) errors.push('Salt for cargo '+c.code+' must be entered and cannot be negative.');
      if (!finiteNonnegative(c.bsw) || c.bsw > 100) errors.push('BS&W for cargo '+c.code+' must be between 0% and 100%.');
    });
    if (errors.length) return {valid: false, errors, total};
    const fractions = s.ratios.map(x => x/100);
    const inlet = fractions.reduce((sum,x,i) => sum+x*s.cargo[i].salt,0);
    const bsw = fractions.reduce((sum,x,i) => sum+x*s.cargo[i].bsw,0);
    const outlet = inlet*(1-s.efficiency/100);
    const daily = fractions.map(x => x*s.capacity);
    const target = daily[2]*s.buffer;
    const coverage = s.stock !== null && daily[2] > 0 ? s.stock/daily[2] : null;
    const shortage = s.stock === null ? null : Math.max(0,target-s.stock);
    const v = s.verification || {};
    const bswMeasured = finiteNonnegative(v.bsw) && v.bsw <= 100;
    const failed = ['compatibility','tan','metal'].some(k=>v[k]==='fail') || (bswMeasured && v.bsw >= 0.05);
    const verified = ['compatibility','tan','metal'].every(k=>v[k]==='pass') && bswMeasured && v.bsw < 0.05;
    return {valid:true, errors:[], total,inlet,bsw,outlet,daily,target,coverage,shortage,saltPass:outlet<2,verification:failed?'fail':verified?'pass':'pending'};
  }
  function preset(index) {
    const s = clone(base);
    if (index === 1) {s.name='Reduced super-heavy'; s.ratios=[55,35,10];s.ratioSource='Assumption';}
    if (index === 2) {s.name='Cleaner super-heavy';s.cargo[1].salt=70;s.cargo[1].bsw=1.5;s.cargo[1].supplier='Cleaner SH supplier — estimate';s.cargo[1].saltSource='Assumption';s.cargo[1].bswSource='Assumption';}
    return s;
  }
  function validSnapshot(s) {
    try {return calculate(s).valid && s.cargo.every(c => typeof c.supplier === 'string') && typeof s.name === 'string';} catch {return false;}
  }
  function chartData(s, result = calculate(s)) {
    const references = [0,1,2].map(index => {
      const candidate=preset(index), r=calculate(candidate);
      return {name:['Baseline','Reduced SH','Cleaner SH'][index],fullName:candidate.name,outlet:r.outlet,index};
    });
    if (!result.valid) return {valid:false,cargo:[],sensitivity:[],buffer:[],scenarios:references,coveragePercent:null};
    const cargo=s.cargo.map((c,i)=>({code:c.code,name:c.type,share:s.ratios[i],salt:c.salt,bsw:c.bsw,saltContribution:s.ratios[i]/100*c.salt,bswContribution:s.ratios[i]/100*c.bsw,daily:result.daily[i]}));
    const lowerEfficiency=Math.max(0,Math.min(90,s.efficiency-4));
    const upperEfficiency=Math.max(99.5,s.efficiency);
    const efficiencies=Array.from({length:41},(_,i)=>lowerEfficiency+(upperEfficiency-lowerEfficiency)*i/40);
    efficiencies.push(s.efficiency);
    if(result.inlet>0){const threshold=(1-2/result.inlet)*100;if(threshold>=lowerEfficiency&&threshold<=upperEfficiency)efficiencies.push(threshold);}
    const sensitivity=[...new Set(efficiencies)].sort((a,b)=>a-b).map(efficiency=>({efficiency,outlet:result.inlet*(1-efficiency/100)}));
    const buffer=s.buffer>0?Array.from({length:21},(_,i)=>({day:s.buffer*i/20,required:result.daily[2]*s.buffer*i/20})):[];
    const coveragePercent=s.stock!==null&&result.target>0?s.stock/result.target*100:null;
    return {valid:true,cargo,sensitivity,buffer,lowerEfficiency,upperEfficiency,coveragePercent,scenarios:[{name:'Selected',fullName:s.name,outlet:result.outlet,index:null},...references]};
  }
  return {base,clone,calculate,preset,validSnapshot,chartData};
});
