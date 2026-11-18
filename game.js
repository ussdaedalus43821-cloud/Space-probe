'use strict';
const el = id => document.getElementById(id);
const cameras = ['a','b'].map(id => el(id).getContext('2d'));
const terrain = new Image(), limb = new Image();
const landmarks = {rim:[.66,.48],floor:[.55,.49],ridge:[.32,.39]};
const initial = {point:[.54,.56],close:false};
const station = [.29,.73];
let planned = [...landmarks.rim], second = null, shot = 1, t = 2, running = false, speed = 1, last = 0;
const simulatedShot = () => shot === 1 ? initial : second;
const distance = p => Math.hypot(p[0]-station[0],p[1]-station[1]);
const arrival = p => 1 + distance(p)*8;
const echo = p => 2.2 + 2.6*Math.abs(p[0]-.56);
const stamp = v => 'T' + (v < 0 ? '−' : '+') + Math.abs(v).toFixed(2).padStart(5,'0') + ' s';
let seed = 907;
const rand = () => ((seed = (1664525*seed+1013904223)>>>0)/4294967296);
const grains = Array.from({length:480}, () => {
  const angle = rand()*Math.PI*2;
  return {angle,velocity:.2+rand()*.8,lift:.15+rand()*.85,size:.5+rand()*1.8,shade:Math.floor(144+rand()*105)};
});
function cross(ctx,x,y,color,label) {
  ctx.strokeStyle=color; ctx.lineWidth=1.5;ctx.beginPath();
  for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){
    ctx.moveTo(x+a*6,y+b*6);ctx.lineTo(x+a*17,y+b*17);
  }
  ctx.stroke();ctx.font='bold 12px monospace';ctx.fillStyle='#10170fd9';ctx.fillRect(x+15,y+5,ctx.measureText(label).width+8,19);ctx.fillStyle=color;ctx.fillText(label,x+19,y+19);
}
function camera(ctx,index) {
  const overhead=index===0, img=overhead?terrain:limb;
  const w=ctx.canvas.width,h=ctx.canvas.height,{point,close}=simulatedShot();
  ctx.clearRect(0,0,w,h);
  const zoom=close?1.45:1;
  ctx.save();ctx.translate(w/2,h/2);ctx.scale(zoom,zoom);ctx.translate(-w/2,-h/2);
  if(img.complete && img.naturalWidth)ctx.drawImage(img,0,0,w,h);
  const x0=overhead?point[0]*w:w*(.5+(point[0]-.5)*.78);
  const y0=overhead?point[1]*h:h*(.45+.12*(point[1]-.5));
  const age=Math.max(t,0);
  if(t>=0){
    if(overhead){ctx.fillStyle='#17191188';ctx.beginPath();ctx.ellipse(x0,y0,8,5,0,0,7);ctx.fill();}
    for(const g of grains){
      const flight=2+g.lift*14, elapsed=Math.min(age,flight), reach=g.velocity*(7+point[0]*7)*elapsed;
      const height=.58*elapsed*(flight-elapsed);
      const dx=reach*(Math.cos(g.angle)+.28), dy=reach*Math.sin(g.angle);
      const x=x0+dx, y=overhead?y0+dy*.62-height*.12:y0+dy*.12-height*3;
      ctx.fillStyle='rgba('+g.shade+','+g.shade+','+(g.shade-10)+','+(age>flight?.30:.82)+')';
      ctx.fillRect(x,y,g.size*(overhead?1:1.2),g.size);
    }
    if(age<.8){const r=6+age*46;const glow=ctx.createRadialGradient(x0,y0,0,x0,y0,r);glow.addColorStop(0,'rgba(255,249,201,'+(1-age/.8)+')');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(x0-r,y0-r,r*2,r*2)}
  }
  cross(ctx,x0,y0,'#f1f4db','I-0'+shot);
  if(overhead){
    cross(ctx,station[0]*w,station[1]*h,'#dbe9c6','STN');
    if(!second)cross(ctx,planned[0]*w,planned[1]*h,'#e1ff96','TARGET 02');
  }
  ctx.restore();
}
function ground(time,p){
  const start=arrival(p);
  function packet(v,f,decay){return v<0?0:Math.sin(v*f)*Math.exp(-v*decay)*Math.min(v*4,1)}
  return .018*Math.sin(time*16)+packet(time-start,19,.76)+.66*packet(time-start-echo(p),14,.64);
}
function trace(){
 const c=el('wave').getContext('2d'),w=c.canvas.width,h=c.canvas.height,p=simulatedShot().point;
 c.fillStyle='#edf0e5';c.fillRect(0,0,w,h);c.strokeStyle='#c5cdb9';c.lineWidth=1;c.beginPath();
 for(let i=0;i<=24;i++){const x=i*w/24;c.moveTo(x,0);c.lineTo(x,h)}
 for(let i=1;i<6;i++){c.moveTo(0,h*i/6);c.lineTo(w,h*i/6)}c.stroke();
 c.strokeStyle='#52683d';c.lineWidth=2;c.beginPath();
 for(let x=0;x<w;x++){let y=h*.5-ground(x/w*24-4,p)*h*.42;if(!x)c.moveTo(x,y);else c.lineTo(x,y)}c.stroke();
 let x=(t+4)/24*w;c.fillStyle='#293a1e';c.fillRect(x,0,3,h);
}
function render(){
 cameras.forEach(camera);trace();el('time').value=t;el('clock').textContent=stamp(t);
 document.querySelectorAll('.camtime').forEach(n=>n.textContent=stamp(t));
 el('play').textContent=running?'Ⅱ Pause':'▶ Play';
 el('shot').textContent='IMPACT 0'+shot+' / REPLAY';
 const close=simulatedShot().close;
 el('capA').textContent=close?'OVERHEAD · CLOSE':'OVERHEAD';
 el('capB').textContent=close?'LIMB · CLOSE':'LIMB VIEW';
}
function frame(now){
 if(!running)return;
 t=Math.min(20,t+(now-last)/1000*speed);last=now;
 if(t>=20)running=false;
 render();if(running)animation=requestAnimationFrame(frame);
}
let animation=0;
function pause(){running=false;cancelAnimationFrame(animation)}
function start(){pause();running=true;last=performance.now();render();animation=requestAnimationFrame(frame)}
el('play').onclick=()=>{if(running){pause();render()}else{if(t>=20)t=-4;start()}};
el('time').oninput=e=>{pause();t=Number(e.target.value);render()};
el('speed').onclick=()=>{speed=speed===1?2:speed===2?.5:1;el('speed').textContent=speed+'×'};
el('target').onchange=e=>{if(landmarks[e.target.value])planned=[...landmarks[e.target.value]];render()};
el('a').onclick=e=>{
 if(second)return;
 const rect=e.target.getBoundingClientRect();planned=[(e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height];
 let option=el('target').querySelector('[value="custom"]');
 if(!option){option=new Option('Marked feature','custom');el('target').add(option)}
 el('target').value='custom';render();
};
function missionUI(){
 el('planning').hidden=!!second;el('results').hidden=!second;
 el('remaining').textContent=second?'00':'01';el('phase').textContent=second?'ARCHIVE':'PLANNING';
 el('planTitle').textContent=second?'Encounter archive':'Second impact';
 el('brief').textContent=second?'Compare both strikes in the mission archive. Scrub the clock to inspect the ejecta and ground motion.':'Review the first strike from two spacecraft. Use the evidence to place your final impactor.';
 if(second){
 const a=arrival(initial.point),b=arrival(second.point);
 el('report').textContent='First ground motion reached the station at +'+a.toFixed(2)+' s on strike 01 and +'+b.toFixed(2)+' s on strike 02. The second pulse followed the first by '+echo(second.point).toFixed(2)+' s on your final strike.';
 }
 el('switch').textContent='Review impact 0'+(shot===1?2:1);
}
el('launch').onclick=()=>{
 second={point:[...planned],close:el('formation').selectedIndex===1};shot=2;t=-4;missionUI();start();
};
el('switch').onclick=()=>{pause();shot=shot===1?2:1;t=2;missionUI();render()};
el('reset').onclick=()=>{pause();second=null;shot=1;t=2;speed=1;el('speed').textContent='1×';planned=[...landmarks.rim];el('target').value='rim';el('formation').selectedIndex=0;missionUI();render()};
terrain.onload=limb.onload=render;terrain.src='terrain.jpg';limb.src='limb.jpg';missionUI();render();
