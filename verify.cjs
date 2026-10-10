const assert = require('node:assert/strict');
const M = require('./dist/model.js');
const approx = (a,b) => assert.ok(Math.abs(a-b)<1e-9, `${a} != ${b}`);
for(const [i,inlet,outlet,bsw] of [[0,67.85,2.0355,2.135],[1,64.2,1.926,2.005],[2,49.85,1.4955,1.215]]) {
  const r=M.calculate(M.preset(i));assert.equal(r.valid,true);approx(r.inlet,inlet);approx(r.outlet,outlet);approx(r.bsw,bsw);assert.equal(r.verification,'pending');assert.equal(r.saltPass,i!==0);
}
let s=M.preset(0);let r=M.calculate(s);assert.deepEqual(r.daily,[150000,120000,30000]);assert.equal(r.target,150000);assert.equal(r.coverage,null);assert.equal(r.shortage,null);
s.stock=90000;r=M.calculate(s);assert.equal(r.coverage,3);assert.equal(r.shortage,60000);
s.stock=180000;r=M.calculate(s);assert.equal(r.coverage,6);assert.equal(r.shortage,0);
s.ratios=[60,40,0];r=M.calculate(s);assert.equal(r.coverage,null);assert.equal(r.target,0);assert.equal(r.shortage,0);
for(const [key,value] of [['efficiency',100],['efficiency',-1],['capacity',-1],['capacity',null],['buffer',-1],['stock',-1],['ratios',[50,50,50]],['ratios',[-1,91,10]],['ratios',[null,90,10]]]){s=M.preset(0);s[key]=value;assert.equal(M.calculate(s).valid,false,`${key}: ${value}`);}
s=M.preset(0);s.cargo[0].salt=-1;assert.equal(M.calculate(s).valid,false);
s=M.preset(0);s.cargo[0].bsw=null;assert.equal(M.calculate(s).valid,false);
s=M.preset(0);s.cargo[0].salt=2;s.cargo[1].salt=2;s.cargo[2].salt=2;s.efficiency=0;assert.equal(M.calculate(s).saltPass,false);
s=M.preset(0);s.verification={compatibility:'pass',tan:'pass',metal:'pass',bsw:0.049};assert.equal(M.calculate(s).verification,'pass');s.verification.bsw=0.05;assert.equal(M.calculate(s).verification,'fail');s.verification.bsw=null;assert.equal(M.calculate(s).verification,'pending');
s=M.preset(0);let chart=M.chartData(s);assert.equal(chart.valid,true);
[21,46,0.85].forEach((v,i)=>approx(chart.cargo[i].saltContribution,v));
[0.6,1.52,0.015].forEach((v,i)=>approx(chart.cargo[i].bswContribution,v));
approx(chart.cargo.reduce((sum,c)=>sum+c.saltContribution,0),67.85);
approx(chart.sensitivity.find(p=>p.efficiency===97).outlet,2.0355);
approx(chart.sensitivity[0].outlet,6.785);
assert.deepEqual(chart.buffer.at(-1),{day:5,required:150000});
assert.equal(chart.coveragePercent,null);s.stock=90000;assert.equal(M.chartData(s).coveragePercent,60);
s.stock=0;assert.equal(M.chartData(s).coveragePercent,0);
s.ratios=[60,40,0];assert.equal(M.chartData(s).coveragePercent,null);
s.buffer=0;assert.deepEqual(M.chartData(s).buffer,[]);
s=M.preset(0);s.ratios=[60,40,10];chart=M.chartData(s);assert.equal(chart.valid,false);assert.deepEqual(chart.sensitivity,[]);assert.deepEqual(chart.cargo,[]);assert.equal(chart.scenarios.length,3);
console.log('PASS: blend/supply formulas, strict limits, independent verification, chart contribution totals, sensitivity, buffer endpoints, missing and zero inventory.');

