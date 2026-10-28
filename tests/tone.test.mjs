import assert from 'node:assert/strict';
import {ReferenceTone} from '../docs/tone.js';import {TINES} from '../docs/pitch.js';
const timers=new Map();let timerID=0;globalThis.setTimeout=fn=>{timers.set(++timerID,fn);return timerID};globalThis.clearTimeout=id=>timers.delete(id);
const oscillators=[];class Param{setValueAtTime(v){this.value=v}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Ctx{constructor(){this.state='running';this.currentTime=0;this.destination={};}resume(){this.state='running';return Promise.resolve()}suspend(){this.state='suspended';return Promise.resolve()}createGain(){return{gain:new Param(),connect(){return this},disconnect(){}}}createOscillator(){const o={frequency:new Param(),connect(){return this},start(){this.started=true},stop(){this.stopped=true},disconnect(){this.disconnected=true}};oscillators.push(o);return o}}
globalThis.window={AudioContext:Ctx};const tone=new ReferenceTone();let completed=0;
for(const t of TINES){await tone.play(t.freq,()=>completed++);assert.equal(tone.voices[0].osc.frequency.value,t.freq);assert.equal(timers.size,1);const f=[...timers.values()][0];f();assert.equal(tone.voices.length,0);assert.equal(timers.size,0)}assert.equal(completed,12);
await tone.play(220,()=>completed++);const old=tone.voices.map(v=>v.osc);await tone.play(440,()=>completed++);assert(old.every(o=>o.stopped&&o.disconnected));assert.equal(timers.size,1);tone.suspend();assert.equal(timers.size,0);assert.equal(tone.context.state,'suspended');assert.equal(completed,12);
let resume;class SlowCtx extends Ctx{resume(){return new Promise(resolve=>resume=resolve)}}
window.AudioContext=SlowCtx;const slow=new ReferenceTone();const pending=slow.play(220,()=>completed++);slow.stop();resume();assert.equal(await pending,false);assert.equal(slow.voices.length,0);
console.log('Reference tone passed: all 12 exact fundamentals, repeat cancellation, stop, suspend and resume-race.');
