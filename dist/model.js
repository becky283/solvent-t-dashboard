(function (root, factory) {
  const model = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  else root.SolventModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const base = {
    name: 'Skenario awal', ratios: [50, 40, 10], ratioSource: 'Case', capacity: 300000,
    capacitySource: 'Case', efficiency: 97, efficiencySource: 'Asumsi', buffer: 5,
    bufferSource: 'Asumsi', stock: null, stockSource: 'Asumsi',
    cargo: [
      {type: 'Heavy', code: 'H', supplier: 'Cargo Heavy — data case', salt: 42, bsw: 1.2, saltSource: 'Case', bswSource: 'Case'},
      {type: 'Super-heavy', code: 'SH', supplier: 'Cargo Super-heavy — data case', salt: 115, bsw: 3.8, saltSource: 'Case', bswSource: 'Case'},
      {type: 'Light', code: 'L', supplier: 'Cargo Light — data case', salt: 8.5, bsw: 0.15, saltSource: 'Case', bswSource: 'Case'}
    ],
    schedule: '', backup: '', stockAge: '',
    verification: {compatibility: 'pending', bsw: null, tan: 'pending', metal: 'pending', notes: ''}
  };
  const finiteNonnegative = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
  function calculate(s) {
    const errors = [];
    if (!s || !Array.isArray(s.ratios) || s.ratios.length !== 3 || !Array.isArray(s.cargo) || s.cargo.length !== 3) return {valid: false, errors: ['Data skenario tidak lengkap.']};
    if (!s.ratios.every(x => finiteNonnegative(x) && x <= 100)) errors.push('Proporsi harus berupa angka 0–100%.');
    const total = s.ratios.reduce((a,b) => a+b, 0);
    if (Math.abs(total-100) > 0.000001) errors.push('Total H + SH + L harus tepat 100%.');
    if (!finiteNonnegative(s.capacity)) errors.push('Kapasitas harus diisi dan tidak boleh negatif.');
    if (!finiteNonnegative(s.efficiency) || s.efficiency >= 100) errors.push('Efisiensi harus 0% hingga kurang dari 100%.');
    if (!finiteNonnegative(s.buffer)) errors.push('Hari buffer harus diisi dan tidak boleh negatif.');
    if (s.stock !== null && !finiteNonnegative(s.stock)) errors.push('Stok light tidak boleh negatif.');
    s.cargo.forEach(c => {
      if (!finiteNonnegative(c.salt)) errors.push('Garam cargo '+c.code+' harus diisi dan tidak boleh negatif.');
      if (!finiteNonnegative(c.bsw) || c.bsw > 100) errors.push('BS&W cargo '+c.code+' harus 0–100%.');
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
    if (index === 1) {s.name='Porsi SH dikurangi'; s.ratios=[55,35,10];s.ratioSource='Asumsi';}
    if (index === 2) {s.name='SH lebih bersih';s.cargo[1].salt=70;s.cargo[1].bsw=1.5;s.cargo[1].supplier='Supplier SH lebih bersih — asumsi';s.cargo[1].saltSource='Asumsi';s.cargo[1].bswSource='Asumsi';}
    return s;
  }
  function validSnapshot(s) {
    try {return calculate(s).valid && s.cargo.every(c => typeof c.supplier === 'string') && typeof s.name === 'string';} catch {return false;}
  }
  return {base,clone,calculate,preset,validSnapshot};
});
