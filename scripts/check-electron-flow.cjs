// Behavioral checks: node scripts/check-electron-flow.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx={};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../data/electron-flow.js'),'utf8'),ctx);
const model=ctx.ElectronTransport;
const baseline=model.settled();
assert(baseline.rates.I>0&&baseline.rates.II>0&&baseline.rates.IV>0&&baseline.rates.atp>0);
const rotenone=model.settled({blocked:{I:true}});
assert.equal(rotenone.rates.I,0);assert(rotenone.rates.II>0&&rotenone.rates.IV>0&&rotenone.nadh>baseline.nadh);
const malonate=model.settled({blocked:{II:true}});
assert.equal(malonate.rates.II,0);assert(malonate.rates.I>0&&malonate.rates.IV>0);
const antimycin=model.settled({blocked:{III:true}});
assert.equal(antimycin.rates.III,0);assert(antimycin.q>11.9&&antimycin.cyt<.01);
for(const settings of [{blocked:{IV:true}},{oxygen:0}]) {
 const s=model.settled(settings);assert.equal(s.rates.IV,0);assert(s.q>11.9&&s.cyt>11.9&&s.nadh>11.9);assert(s.rates.atp<.001);
}
const oligomycin=model.settled({blocked:{V:true}}),uncoupled=model.settled({uncoupled:true});
assert.equal(oligomycin.rates.atp,0);assert(oligomycin.protons>baseline.protons&&oligomycin.rates.IV<baseline.rates.IV);
assert(uncoupled.protons<baseline.protons&&uncoupled.rates.atp<baseline.rates.atp&&uncoupled.rates.IV>baseline.rates.IV);
const rescued=model.settled({blocked:{V:true},uncoupled:true});
assert.equal(rescued.rates.atp,0);assert(rescued.rates.IV>oligomycin.rates.IV);
const starved=model.settled({nadh:false,succinate:false});assert(starved.rates.IV<.001&&starved.rates.atp<.001);
const rbc=model.settled({mitochondria:false});assert(Object.values(rbc.rates).every(x=>x===0));
const s=model.create(),initial=s.nadh+s.q+s.cyt;
for(let i=0;i<12000;i++) {
 const options={blocked:{I:i%311<100,II:i%733<200,III:i%677<80,IV:i%877<120,V:i%571<90},oxygen:(i%503)/502,uncoupled:i%1301<300,nadh:i%701<500,succinate:i%601<450};
 model.step(s,.025,options);
 for(const key of ['nadh','q','cyt']) assert(s[key]>=0&&s[key]<=model.capacity,`${key} pool must stay bounded`);
 assert(s.protons>=0&&s.protons<=model.protonCapacity,'Gradient must stay bounded');
 assert(Math.abs(initial+s.input-s.output-s.nadh-s.q-s.cyt)<1e-8,'Electron equivalents must be conserved');
 assert(Math.abs(s.output-4*s.oxygen)<1e-8&&Math.abs(s.output-2*s.water)<1e-8,'Oxygen / water stoichiometry');
}
console.log('PASS electron conservation, bounded pools, O₂/water balance, donor depletion, RBCs, I/II bypass, III/IV blockade, oligomycin, uncoupling and respiratory rescue');
