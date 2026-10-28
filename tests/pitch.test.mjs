import assert from 'node:assert/strict';
import {TINES,ORDER,detectPitch,centsBetween,nearestTine} from '../docs/pitch.js';
assert.equal(new Set(ORDER).size,12);assert.equal(detectPitch(new Float32Array(8192),48000),null);
let worst=0,count=0;
for(const t of TINES)for(const offset of[-35,-10,0,10,35]){
 const f=t.freq*2**(offset/1200),sr=48000;
 const x=Float32Array.from({length:8192},(_,i)=>.3*Math.sin(2*Math.PI*f*i/sr)*Math.exp(-i/sr*2)+.008*Math.sin(2*Math.PI*f*6.35*i/sr));
 const r=detectPitch(x,sr);assert(r,`${t.note}: no estimate`);const err=Math.abs(centsBetween(r.freq,f));worst=Math.max(err,worst);assert(err<5,`${t.note}: ${err.toFixed(2)} cents error`);assert.equal(nearestTine(r.freq).id,t.id);count++;
}
console.log(`${count} pitch cases passed; worst error ${worst.toFixed(2)} cents. Silence and 12-tine mapping passed.`);
