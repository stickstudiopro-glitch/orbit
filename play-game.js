// ═══════════════════════════════════════════════
//  SCREEN MANAGEMENT
// ═══════════════════════════════════════════════
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  const el = document.getElementById(id);
  if(el) el.classList.remove('hidden');
}
function showGame(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  document.getElementById('gameWrap').classList.add('active');
}

function makeStars(containerId, count=60){
  const c = document.getElementById(containerId);
  if(!c) return;
  for(let i=0;i<count;i++){
    const d = document.createElement('div');
    d.className='star-dot';
    const s = Math.random()*3+1;
    d.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-delay:${Math.random()*3}s;animation-duration:${2+Math.random()*2}s`;
    c.appendChild(d);
  }
}
makeStars('startStars'); makeStars('howStars'); makeStars('goStars');

// ═══════════════════════════════════════════════
//  CANVAS + GAME ENGINE
// ═══════════════════════════════════════════════
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize(){
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const GS = {
  running: false, paused: false, level: 1, score: 0, kills: 0, lives: 3,
  health: 100, maxHealth: 100, startTime: 0, autoFire: false, autoFireTimer: 0,
};

const player = {
  x:0, y:0, w:36, h:36, speed:5, vx:0, vy:0,
  color:'#00ffff', invincible:0, angle:0,
};

let bullets=[], enemyBullets=[], enemies=[], particles=[], powerups=[], stars=[];
const keys={};
let mouseX=200, mouseY=200;
const dpadState={up:false,down:false,left:false,right:false};

function getLevelConfig(level){
  const easy = Math.min(level, 10);
  const mid   = Math.max(0, Math.min(level-10, 40));
  const hard  = Math.max(0, level-50);
  return {
    enemies:   Math.floor(3 + easy*0.7 + mid*0.5 + hard*0.3),
    speed:     0.5 + easy*0.08 + mid*0.04 + hard*0.03,
    health:    1 + Math.floor(level/8),
    shootRate: Math.max(0.005, 0.025 - level*0.0002),
    bulletSpd: 2.5 + level*0.04,
    bossEvery: (level % 10 === 0),
    powerupChance: 0.25,
    pattern:   level < 5 ? 'line' : level < 15 ? 'wave' : level < 30 ? 'grid' : level < 50 ? 'spiral' : 'chaos',
  };
}

function spawnWave(){
  const cfg = getLevelConfig(GS.level);
  const count = cfg.enemies + (cfg.bossEvery ? 1 : 0);
  for(let i=0; i<count; i++){
    const isBoss = cfg.bossEvery && i === count-1;
    const sz = isBoss ? 48 : 18+Math.random()*14;
    let ex, ey=-80;
    if(cfg.pattern==='line') ex = (i+1)*(canvas.width/(count+1));
    else if(cfg.pattern==='grid'){
      const cols = Math.ceil(Math.sqrt(count));
      ex = ((i%cols)+1)*(canvas.width/(cols+1));
      ey = -80 - Math.floor(i/cols)*80;
    } else {
      ex = 60 + Math.random()*(canvas.width-120);
      ey = -60 - Math.random()*300;
    }
    const hue = isBoss ? 0 : (280 + GS.level*12)%360;
    enemies.push({
      x:ex, y:ey, w:sz, h:sz,
      hp: isBoss ? cfg.health*5 : cfg.health,
      maxHp: isBoss ? cfg.health*5 : cfg.health,
      speed: isBoss ? cfg.speed*0.6 : cfg.speed*(0.7+Math.random()*0.6),
      color: isBoss ? '#ff3366' : `hsl(${hue},100%,55%)`,
      glowColor: isBoss ? '#ff0040' : `hsl(${hue},100%,70%)`,
      shootTimer: Math.random()*120, shootRate: cfg.shootRate,
      bulletSpd: cfg.bulletSpd, boss: isBoss,
      vx: cfg.pattern==='wave' ? Math.sin(i)*2 : 0,
      wobble: Math.random()*Math.PI*2,
    });
  }
}

function spawnPowerup(x,y){
  if(Math.random()>getLevelConfig(GS.level).powerupChance) return;
  const types=['health','shield','rapid','bomb'];
  const type=types[Math.floor(Math.random()*types.length)];
  const icons={health:'❤️',shield:'🛡️',rapid:'⚡',bomb:'💣'};
  powerups.push({x,y,vx:(Math.random()-.5)*2,vy:1.5,type,icon:icons[type],life:300,r:16});
}

function drawShip(x,y,angle,w,color,glow){
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);
  ctx.shadowBlur=20; ctx.shadowColor=glow||color;
  ctx.beginPath();
  ctx.moveTo(0,-w); ctx.lineTo(-w*.6,w*.7); ctx.lineTo(0,w*.4); ctx.lineTo(w*.6,w*.7);
  ctx.closePath();
  ctx.fillStyle=color; ctx.fill();
  ctx.beginPath(); ctx.arc(0,-w*.2,w*.22,0,Math.PI*2);
  ctx.fillStyle=glow||'#ff00ff'; ctx.fill();
  ctx.beginPath(); ctx.ellipse(0,w*.5,w*.25,w*.18,0,0,Math.PI*2);
  ctx.fillStyle='rgba(255,200,0,.6)'; ctx.fill();
  ctx.restore();
}

function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x,e.y);
  ctx.shadowBlur=e.boss?35:18; ctx.shadowColor=e.glowColor;
  if(e.boss){
    ctx.beginPath();
    for(let i=0;i<8;i++){const a=Math.PI*2/8*i; ctx.lineTo(Math.cos(a)*e.w,Math.sin(a)*e.w);}
    ctx.closePath(); ctx.fillStyle=e.color; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.3)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-e.w,0); ctx.lineTo(e.w,0); ctx.moveTo(0,-e.w); ctx.lineTo(0,e.w); ctx.stroke();
    const bw=e.w*2.5;
    ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(-bw/2,e.w+8,bw,8);
    ctx.fillStyle=e.color; ctx.fillRect(-bw/2,e.w+8,bw*(e.hp/e.maxHp),8);
  } else {
    ctx.beginPath();
    for(let i=0;i<6;i++){const a=Math.PI/3*i; ctx.lineTo(Math.cos(a)*e.w,Math.sin(a)*e.w);}
    ctx.closePath(); ctx.fillStyle=e.color; ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.lineWidth=1.5; ctx.stroke();
  }
  if(!e.boss && e.maxHp>1){
    const pip=6, gap=3, total=e.maxHp*(pip+gap);
    for(let p=0;p<e.maxHp;p++){
      ctx.fillStyle = p<e.hp ? e.color : 'rgba(255,255,255,.15)';
      ctx.beginPath(); ctx.arc(-total/2 + p*(pip+gap)+pip/2, e.w+10, pip/2,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawBullet(b, isEnemy){
  ctx.save();
  ctx.shadowBlur=15; ctx.shadowColor=b.color;
  ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
  ctx.fillStyle=b.color; ctx.fill();
  ctx.globalAlpha=.3; ctx.beginPath(); ctx.arc(b.x-b.vx*2,b.y-b.vy*2,b.r*.7,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawParticle(p){
  ctx.save();
  ctx.globalAlpha=p.life/p.maxLife;
  ctx.shadowBlur=10; ctx.shadowColor=p.color;
  ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
  ctx.fillStyle=p.color; ctx.fill();
  ctx.restore();
}

function drawPowerup(pu){
  ctx.save();
  ctx.translate(pu.x,pu.y);
  ctx.shadowBlur=20; ctx.shadowColor=pu.type==='health'?'#ff88aa':'#ffffaa';
  ctx.beginPath(); ctx.arc(0,0,pu.r+4,0,Math.PI*2);
  ctx.strokeStyle=pu.type==='health'?'#ff4488':'#ffdd00';
  ctx.lineWidth=2; ctx.stroke();
  ctx.font=`${pu.r*1.5}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(pu.icon,0,0);
  ctx.restore();
}

function explode(x,y,color,count=12){
  for(let i=0;i<count;i++){
    const spd=1.5+Math.random()*4;
    const angle=Math.random()*Math.PI*2;
    particles.push({
      x,y,
      vx:Math.cos(angle)*spd,
      vy:Math.sin(angle)*spd,
      r:1.5+Math.random()*3,
      color,
      life:40+Math.random()*30,
      maxLife:70,
    });
  }
}

function playerShoot(){
  const angle = Math.atan2(mouseY-player.y, mouseX-player.x);
  const spd=12 + Math.min(GS.level,20)*0.15;
  bullets.push({
    x:player.x, y:player.y,
    vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd,
    r:5, color:'#ffff00',
  });
  if(GS.level>=20){
    bullets.push({
      x:player.x, y:player.y,
      vx:Math.cos(angle+.2)*spd, vy:Math.sin(angle+.2)*spd,
      r:4, color:'#ffaa00',
    });
  }
  if(GS.level>=40){
    bullets.push({
      x:player.x, y:player.y,
      vx:Math.cos(angle-.2)*spd, vy:Math.sin(angle-.2)*spd,
      r:4, color:'#ff8800',
    });
  }
}

let rapidFire=0, shield=false, shieldTimer=0;
const SHOOT_COOLDOWN_BASE=18;
let shootCooldown=0;

function update(){
  let dx=0, dy=0;
  if(keys['arrowleft']||keys['a']||dpadState.left)  dx=-1;
  if(keys['arrowright']||keys['d']||dpadState.right) dx=1;
  if(keys['arrowup']||keys['w']||dpadState.up)       dy=-1;
  if(keys['arrowdown']||keys['s']||dpadState.down)   dy=1;
  if(dx&&dy){dx*=.707;dy*=.707;}
  player.vx = dx*player.speed;
  player.vy = dy*player.speed;
  player.x = Math.max(player.w,Math.min(canvas.width-player.w,  player.x+player.vx));
  player.y = Math.max(player.h,Math.min(canvas.height-player.h, player.y+player.vy));
  player.angle = Math.atan2(mouseY-player.y, mouseX-player.x) + Math.PI/2;
  if(player.invincible>0) player.invincible--;
  if(shieldTimer>0) shieldTimer--;
  else shield=false;
  if(rapidFire>0) rapidFire--;

  const cd = rapidFire>0 ? 6 : SHOOT_COOLDOWN_BASE - Math.min(GS.level,12);
  if(shootCooldown>0) shootCooldown--;
  if(GS.autoFire && shootCooldown<=0){ playerShoot(); shootCooldown=cd; }

  bullets = bullets.filter(b=>{
    b.x+=b.vx; b.y+=b.vy;
    return b.x>-10&&b.x<canvas.width+10&&b.y>-10&&b.y<canvas.height+10;
  });

  enemyBullets = enemyBullets.filter(b=>{
    b.x+=b.vx; b.y+=b.vy;
    return b.x>-10&&b.x<canvas.width+10&&b.y>-10&&b.y<canvas.height+10;
  });

  enemies.forEach(e=>{
    e.wobble+=0.04;
    e.y += e.speed;
    e.x += e.vx + Math.sin(e.wobble)*0.5;
    e.x = Math.max(e.w,Math.min(canvas.width-e.w,e.x));
    e.shootTimer++;
    if(e.shootTimer > 80 && Math.random()<e.shootRate){
      const ang=Math.atan2(player.y-e.y, player.x-e.x);
      enemyBullets.push({x:e.x,y:e.y,vx:Math.cos(ang)*e.bulletSpd,vy:Math.sin(ang)*e.bulletSpd,r:4,color:'#ff3366'});
      e.shootTimer=0;
    }
    if(e.y>canvas.height+80) e.hp=0;
  });

  powerups.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;});
  powerups=powerups.filter(p=>p.life>0&&p.y<canvas.height+40);

  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vx*=.96;p.vy*=.96;p.life--;});
  particles=particles.filter(p=>p.life>0);

  for(let bi=bullets.length-1;bi>=0;bi--){
    const b=bullets[bi]; let hit=false;
    for(let ei=enemies.length-1;ei>=0;ei--){
      const e=enemies[ei];
      const d=Math.hypot(b.x-e.x,b.y-e.y);
      if(d < b.r+e.w){
        e.hp--; explode(b.x,b.y,e.glowColor,6);
        if(e.hp<=0){
          explode(e.x,e.y,e.glowColor,e.boss?30:14);
          GS.score += e.boss ? 500*GS.level : 10*GS.level;
          GS.kills++;
          spawnPowerup(e.x,e.y);
          enemies.splice(ei,1);
        }
        bullets.splice(bi,1); hit=true; break;
      }
    }
  }

  if(player.invincible<=0){
    for(let bi=enemyBullets.length-1;bi>=0;bi--){
      const b=enemyBullets[bi];
      const d=Math.hypot(b.x-player.x,b.y-player.y);
      if(d<b.r+player.w*.7){
        if(shield){explode(b.x,b.y,'#00ffff',5);enemyBullets.splice(bi,1);continue;}
        GS.health-=8; explode(b.x,b.y,'#ff3366',5);
        enemyBullets.splice(bi,1);
        player.invincible=40;
        if(GS.health<=0) loseLife();
      }
    }
    for(let ei=enemies.length-1;ei>=0;ei--){
      const e=enemies[ei];
      const d=Math.hypot(e.x-player.x,e.y-player.y);
      if(d<e.w+player.w*.8){
        GS.health-=e.boss?25:15; explode(e.x,e.y,e.glowColor,12);
        enemies.splice(ei,1);
        player.invincible=60;
        if(GS.health<=0) loseLife();
      }
    }
  }

  for(let pi=powerups.length-1;pi>=0;pi--){
    const p=powerups[pi];
    const d=Math.hypot(p.x-player.x,p.y-player.y);
    if(d<p.r+player.w*.9){
      applyPowerup(p.type); explode(p.x,p.y,'#ffff00',10);
      powerups.splice(pi,1);
    }
  }

  if(enemies.length===0 && GS.running && !GS.paused){
    nextLevel();
  }

  updateHUD();
}

function applyPowerup(type){
  if(type==='health'){ GS.health=Math.min(GS.maxHealth,GS.health+30); showMsg('❤️ +HEALTH!');}
  if(type==='shield'){ shield=true; shieldTimer=300; showMsg('🛡️ SHIELD!'); }
  if(type==='rapid'){  rapidFire=200; showMsg('⚡ RAPID FIRE!'); }
  if(type==='bomb'){
    enemies.forEach(e=>{explode(e.x,e.y,e.glowColor,12);GS.score+=5*GS.level;GS.kills++;});
    enemies.length=0; showMsg('💣 BOMB!');
  }
}

let msgTimer=0, msgText='';
function showMsg(txt){ msgText=txt; msgTimer=90; }

function loseLife(){
  GS.lives--;
  GS.health=GS.maxHealth;
  player.invincible=120;
  if(GS.lives<=0) gameOver();
}

const starsBg=[];
for(let i=0;i<120;i++) starsBg.push({x:Math.random()*3000,y:Math.random()*3000,r:.5+Math.random()*1.5,spd:.1+Math.random()*.4});

function drawBackground(){
  ctx.fillStyle='rgba(6,0,26,.25)';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  starsBg.forEach(s=>{
    s.y+=s.spd;
    if(s.y>canvas.height+2){s.y=-2;s.x=Math.random()*canvas.width;}
    ctx.globalAlpha=.4+Math.random()*.3;
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(s.x%canvas.width,s.y,s.r,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  });
}

function draw(){
  drawBackground();
  enemies.forEach(e=>drawEnemy(e));
  bullets.forEach(b=>drawBullet(b,false));
  enemyBullets.forEach(b=>drawBullet(b,true));
  powerups.forEach(p=>drawPowerup(p));
  particles.forEach(p=>drawParticle(p));

  if(player.invincible<=0 || Math.floor(player.invincible/4)%2===0){
    drawShip(player.x,player.y,player.angle,player.w,player.color,'#ff00ff');
    if(shield){
      ctx.save();
      ctx.globalAlpha=.35+Math.sin(Date.now()*.01)*.15;
      ctx.strokeStyle='#00ffff'; ctx.lineWidth=3;
      ctx.shadowBlur=20; ctx.shadowColor='#00ffff';
      ctx.beginPath(); ctx.arc(player.x,player.y,player.w*1.4,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  }

  if(msgTimer>0){
    msgTimer--;
    ctx.save();
    ctx.globalAlpha=Math.min(1,msgTimer/20);
    ctx.font=`bold ${clamp(20,4,36)}px Orbitron,monospace`;
    ctx.fillStyle='#ffff00'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowBlur=20; ctx.shadowColor='#ffaa00';
    ctx.fillText(msgText, canvas.width/2, canvas.height/2-60);
    ctx.restore();
  }
}

function clamp(base,vw,max){return Math.min(max,Math.max(base,window.innerWidth*vw/100));}

function updateHUD(){
  document.getElementById('hudScore').textContent=GS.score.toLocaleString();
  document.getElementById('hudLevel').textContent=`LEVEL ${GS.level} / 100`;
  document.getElementById('hudEnemies').textContent=enemies.length;
  const hp=Math.max(0,(GS.health/GS.maxHealth)*100);
  document.getElementById('healthFill').style.width=hp+'%';
  document.getElementById('healthFill').style.background=
    hp>60?'linear-gradient(90deg,#00ff88,#00ffff)':
    hp>30?'linear-gradient(90deg,#ffaa00,#ffff00)':
          'linear-gradient(90deg,#ff3366,#ff8800)';
  document.getElementById('hudLives').textContent='❤️'.repeat(Math.max(0,GS.lives));
}

function nextLevel(){
  if(GS.level>=100){ winGame(); return; }
  GS.level++;
  GS.health=Math.min(GS.maxHealth, GS.health+20);
  showWaveBanner();
  setTimeout(()=>{ if(GS.running) spawnWave(); }, 2000);
}

function showWaveBanner(){
  const b=document.getElementById('waveBanner');
  const label = GS.level%10===0 ? '👾 BOSS LEVEL!' :
                 GS.level<=5 ? 'NICE!' :
                 GS.level<=20 ? 'GREAT!' :
                 GS.level<=50 ? 'AWESOME!' : '🔥 INTENSE!';
  b.textContent = `LEVEL ${GS.level}   ${label}`;
  b.style.display='block';
  b.style.animation='none';
  setTimeout(()=>{ b.style.animation='wavePop 2.2s ease forwards'; },10);
  setTimeout(()=>{ b.style.display='none'; },2300);
}

let rafId=null;
function loop(){
  if(!GS.running||GS.paused){ rafId=null; return; }
  update();
  draw();
  rafId=requestAnimationFrame(loop);
}

function startGame(){
  GS.running=true; GS.paused=false;
  GS.level=1; GS.score=0; GS.kills=0; GS.lives=3; GS.health=100;
  GS.startTime=Date.now();
  player.x=canvas.width/2; player.y=canvas.height-100;
  player.invincible=0;
  bullets.length=0; enemyBullets.length=0; enemies.length=0;
  particles.length=0; powerups.length=0;
  shield=false; rapidFire=0;
  showGame();
  document.getElementById('pauseMenu').classList.remove('active');
  showWaveBanner();
  setTimeout(spawnWave,1800);
  if(rafId) cancelAnimationFrame(rafId);
  rafId=requestAnimationFrame(loop);
}

function stopGame(){
  GS.running=false;
  if(rafId){cancelAnimationFrame(rafId);rafId=null;}
  document.getElementById('gameWrap').classList.remove('active');
}

function gameOver(){
  GS.running=false;
  if(rafId){cancelAnimationFrame(rafId);rafId=null;}
  const elapsed=Math.round((Date.now()-GS.startTime)/1000);
  document.getElementById('finalScore').textContent=GS.score.toLocaleString();
  document.getElementById('goLevel').textContent=GS.level;
  document.getElementById('goKills').textContent=GS.kills;
  document.getElementById('goTime').textContent=elapsed+'s';
  document.getElementById('gameWrap').classList.remove('active');
  show('gameOverScreen');
}

function winGame(){
  GS.running=false;
  if(rafId){cancelAnimationFrame(rafId);rafId=null;}
  document.getElementById('winScore').textContent=GS.score.toLocaleString();
  document.getElementById('gameWrap').classList.remove('active');
  makeConfetti();
  show('winScreen');
}

function makeConfetti(){
  const c=document.getElementById('winConfetti');
  c.innerHTML='';
  const colors=['#00ffff','#ff00ff','#ffff00','#00ff88','#ff3366'];
  for(let i=0;i<40;i++){
    const d=document.createElement('div');
    d.className='confetti';
    d.style.cssText=`left:${Math.random()*100}%;top:-10px;background:${colors[Math.floor(Math.random()*colors.length)]};width:${6+Math.random()*8}px;height:${6+Math.random()*8}px;animation-duration:${2+Math.random()*1}s;animation-delay:${Math.random()*0.5}s`;
    c.appendChild(d);
  }
}

function setPause(p){
  GS.paused=p;
  const pm=document.getElementById('pauseMenu');
  if(p){ pm.classList.add('active'); if(rafId){cancelAnimationFrame(rafId);rafId=null;} }
  else { pm.classList.remove('active'); if(GS.running){rafId=requestAnimationFrame(loop);} }
}

document.addEventListener('keydown',e=>{
  keys[e.key.toLowerCase()]=true;
  if(e.key===' '){
    e.preventDefault();
    if(GS.running&&!GS.paused&&shootCooldown<=0){ playerShoot(); shootCooldown=SHOOT_COOLDOWN_BASE-Math.min(GS.level,12); }
  }
  if(e.key==='Escape') if(GS.running) setPause(!GS.paused);
});
document.addEventListener('keyup',e=>{ keys[e.key.toLowerCase()]=false; });

canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  mouseX=(e.clientX-r.left)*(canvas.width/r.width);
  mouseY=(e.clientY-r.top)*(canvas.height/r.height);
});

canvas.addEventListener('click',()=>{
  if(GS.running&&!GS.paused&&shootCooldown<=0){ playerShoot(); shootCooldown=SHOOT_COOLDOWN_BASE-Math.min(GS.level,12); }
});

canvas.addEventListener('touchmove',e=>{
  if(!GS.running) return;
  const r=canvas.getBoundingClientRect();
  const t=e.touches[0];
  mouseX=(t.clientX-r.left)*(canvas.width/r.width);
  mouseY=(t.clientY-r.top)*(canvas.height/r.height);
});

canvas.addEventListener('touchstart',e=>{
  if(GS.running&&!GS.paused&&shootCooldown<=0){ playerShoot(); shootCooldown=SHOOT_COOLDOWN_BASE-Math.min(GS.level,12); }
});

['dUp','dDown','dLeft','dRight'].forEach(id=>{
  const el=document.getElementById(id);
  if(!el) return;
  const key = id.replace('d','').toLowerCase();
  const padKey = key==='up'?'up':key==='down'?'down':key==='left'?'left':'right';
  el.addEventListener('touchstart',e=>{e.preventDefault();dpadState[padKey]=true;el.classList.add('pressed');});
  el.addEventListener('touchend',e=>{e.preventDefault();dpadState[padKey]=false;el.classList.remove('pressed');});
  el.addEventListener('mousedown',()=>{dpadState[padKey]=true;el.classList.add('pressed');});
  el.addEventListener('mouseup',()=>{dpadState[padKey]=false;el.classList.remove('pressed');});
});

const fireBtn=document.getElementById('fireBtn');
if(fireBtn){
  fireBtn.addEventListener('touchstart',e=>{e.preventDefault();if(GS.running&&!GS.paused&&shootCooldown<=0){playerShoot();shootCooldown=SHOOT_COOLDOWN_BASE-Math.min(GS.level,12);}fireBtn.classList.add('pressed');});
  fireBtn.addEventListener('touchend',e=>{e.preventDefault();fireBtn.classList.remove('pressed');});
  fireBtn.addEventListener('mousedown',()=>{if(GS.running&&!GS.paused&&shootCooldown<=0){playerShoot();shootCooldown=SHOOT_COOLDOWN_BASE-Math.min(GS.level,12);}fireBtn.classList.add('pressed');});
  fireBtn.addEventListener('mouseup',()=>{fireBtn.classList.remove('pressed');});
}

const autoBtn=document.getElementById('autoBtn');
if(autoBtn){
  autoBtn.addEventListener('click',()=>{
    GS.autoFire=!GS.autoFire;
    document.getElementById('autoLabel').textContent=GS.autoFire?'ON':'OFF';
    autoBtn.style.background=GS.autoFire?'#00ffff':'transparent';
    autoBtn.style.color=GS.autoFire?'#06001a':'#00ffff';
  });
}

const pauseBtn=document.getElementById('pauseBtn');
if(pauseBtn) pauseBtn.addEventListener('click',()=>{ if(GS.running) setPause(!GS.paused); });

const startBtn=document.getElementById('startBtn');
if(startBtn) startBtn.addEventListener('click',startGame);

const howBtn=document.getElementById('howBtn');
if(howBtn) howBtn.addEventListener('click',()=>show('howScreen'));

const howStartBtn=document.getElementById('howStartBtn');
if(howStartBtn) howStartBtn.addEventListener('click',()=>{show('startScreen');setTimeout(startGame,100);});

const resumeBtn=document.getElementById('resumeBtn');
if(resumeBtn) resumeBtn.addEventListener('click',()=>setPause(false));

const quitBtn=document.getElementById('quitBtn');
if(quitBtn) quitBtn.addEventListener('click',()=>{setPause(false);show('startScreen');stopGame();});

const retryBtn=document.getElementById('retryBtn');
if(retryBtn) retryBtn.addEventListener('click',startGame);
