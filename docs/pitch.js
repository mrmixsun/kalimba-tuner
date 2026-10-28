/* Pitch detection for one plucked tine. Input should be low-pass filtered. */
export const TINES = [
 [1,'A3','ля',57],[2,'B3','си',59],[3,'D4','ре',62],[4,'E4','ми',64],
 [5,'F♯4','фа♯',66],[6,'A4','ля',69],[7,'B4','си',71],[8,'D5','ре',74],
 [9,'E5','ми',76],[10,'F♯5','фа♯',78],[11,'A5','ля',81],[12,'B5','си',83]
].map(([id,note,ru,midi])=>({id,note,ru,midi,freq:440*2**((midi-69)/12)}));
export const ORDER = [12,10,8,6,4,2,1,3,5,7,9,11];
export function detectPitch(input, rate) {
 const stride=Math.max(1,Math.floor(rate/24000)), n=Math.floor(input.length/stride), sr=rate/stride;
 const x=new Float32Array(n);let energy=0, mean=0;
 for(let i=0;i<n;i++){let s=0;for(let k=0;k<stride;k++)s+=input[i*stride+k];x[i]=s/stride;mean+=x[i];}
 mean/=n;for(let i=0;i<n;i++){x[i]-=mean;energy+=x[i]*x[i];}
 const rms=Math.sqrt(energy/n);if(rms<.0015)return null;
 const min=Math.floor(sr/1150),max=Math.min(Math.ceil(sr/185),Math.floor(n/3));
 const w=n-max, d=new Float32Array(max+1);let sum=0;d[0]=1;
 for(let lag=1;lag<=max;lag++){let v=0;for(let i=0;i<w;i++){let delta=x[i]-x[i+lag];v+=delta*delta;}sum+=v;d[lag]=sum?v*lag/sum:1;}
 let best=-1;
 for(let lag=Math.max(2,min);lag<max;lag++)if(d[lag]<.2&&d[lag]<=d[lag-1]&&d[lag]<d[lag+1]){best=lag;break;}
 if(best<0)return null;
 const prev=d[best-1],next=d[best+1],den=prev-2*d[best]+next;
 const offset=den?Math.max(-.5,Math.min(.5,(prev-next)/(2*den))):0;
 const freq=sr/(best+offset);
 if(freq<185||freq>1150)return null;
 return {freq,confidence:1-d[best],rms};
}
export const centsBetween=(frequency,target)=>1200*Math.log2(frequency/target);
export function nearestTine(freq){return TINES.reduce((best,t)=>Math.abs(centsBetween(freq,t.freq))<Math.abs(centsBetween(freq,best.freq))?t:best,TINES[0]);}
