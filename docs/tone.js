// A short synthesized reference tone, tuned exactly to the selected frequency.
// No microphone, external samples or network access are needed for playback.
export class ReferenceTone {
 constructor(){this.context=null;this.voices=[];this.generation=0;this.timer=null;}
 stop(){
  this.generation++;clearTimeout(this.timer);this.timer=null;
  for(const {osc,gain} of this.voices){try{osc.stop();}catch{}osc.disconnect();gain.disconnect();}
  this.voices=[];
 }
 async play(frequency,onFinished){
  this.stop();const generation=this.generation;
  try{
   const Ctx=window.AudioContext||window.webkitAudioContext;
   if(!this.context||this.context.state==='closed')this.context=new Ctx();
   await this.context.resume();
   if(generation!==this.generation)return false;
   const now=this.context.currentTime,duration=1.5;
   for(const [multiple,volume,decay] of [[1,.22,1.4],[2,.035,.65],[3,.012,.35]]){
    const osc=this.context.createOscillator(),gain=this.context.createGain();
    osc.type='sine';osc.frequency.setValueAtTime(frequency*multiple,now);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(volume,now+.008);
    gain.gain.exponentialRampToValueAtTime(.0001,now+decay);
    gain.gain.setValueAtTime(0,now+duration);
    osc.connect(gain).connect(this.context.destination);osc.start(now);osc.stop(now+duration);
    this.voices.push({osc,gain});
   }
   // Allow the speaker/room tail and analyser buffer to clear before listening.
   this.timer=setTimeout(()=>{if(generation!==this.generation)return;this.stop();onFinished();},2000);
   return true;
  }catch(error){if(generation===this.generation)this.stop();throw error;}
 }
 suspend(){this.stop();if(this.context&&this.context.state!=='closed')this.context.suspend().catch(()=>{});}
}
