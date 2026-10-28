import assert from 'node:assert/strict';import fs from 'node:fs';
class El{constructor(){this.textContent='';this.hidden=false;this.style={setProperty(){}};this.dataset={};this.attrs={};this.children=[];this.classes=new Set();this.classList={add:(...c)=>c.forEach(v=>this.classes.add(v)),remove:(...c)=>c.forEach(v=>this.classes.delete(v)),toggle:(v,b)=>b?this.classes.add(v):this.classes.delete(v)};}setAttribute(k,v){this.attrs[k]=v;}append(c){this.children.push(c);}addEventListener(){}querySelector(){return this;} }
const elements=new Map();globalThis.document={getElementById(id){if(!elements.has(id))elements.set(id,new El());return elements.get(id)},querySelector(){return this.getElementById('tuner')},createElement(){return new El()},addEventListener(){}};globalThis.window={addEventListener(){}};
let source=fs.readFileSync(new URL('../docs/app.js',import.meta.url),'utf8');source=source.replace("'./pitch.js'",JSON.stringify(new URL('../docs/pitch.js',import.meta.url).href));source+='\nexport {process,select};';const app=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const {TINES}=await import('../docs/pitch.js');
const el=id=>document.getElementById(id);assert.equal(el('tines').children.length,12);
let tick=1000;const feed=f=>{for(let i=0;i<8;i++)app.process({freq:f,confidence:.99,rms:.2},tick+=100)};
app.select(TINES[0]);feed(220*2**(-20/1200));assert.equal(el('instruction').textContent,'Повысь звук');assert.equal(el('note').textContent,'A3');
feed(220*2**(20/1200));assert.equal(el('instruction').textContent,'Понизь звук');feed(220);assert.equal(el('instruction').textContent,'Настроено');
feed(440);assert.equal(el('note').textContent,'A3');assert.equal(el('instruction').textContent,'Проверь язычок');
el('auto').onclick();feed(TINES[9].freq);assert.equal(el('note').textContent,'F♯5');assert.equal(el('instruction').textContent,'Настроено');
app.process(null,tick+1500);assert.equal(el('needle').hidden,true);assert.equal(el('note').textContent,'—');
console.log('UI states passed: 12 tines, lower/higher/in tune, manual lock, automatic selection, stale-signal clearing.');
