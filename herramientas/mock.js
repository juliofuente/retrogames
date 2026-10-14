// mock mínimo del motor para simular juegos en node
const noop=()=>{};
global.Arcade={ri:(a,b)=>a+Math.floor(Math.random()*(b-a+1)),rand:(a,b)=>a+Math.random()*(b-a),clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),pick:a=>a[Math.floor(Math.random()*a.length)],
shuffle:a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a},
game:d=>global.DEF=d,tone:noop,noise:noop,sfx:new Proxy({},{get:()=>noop}),T:(a)=>a,emoji:noop,txt:noop,rr:noop,current:{def:null}};
global.setTimeout=(f)=>{global.PENDING=f};
global.mkG=(lv)=>{const g={lv,level:lv,W:400,H:800,top:60,bot:780,state:'play',rt:0,lives:3,score:0,burst:noop,shake:noop,message:noop,float:noop,ring:noop,confetti:noop,flash:noop,scenery:noop,hud:noop,
 addScore(n){g.score+=n},win(st){g.state='win';g.stars=st},die(){g.lives--;if(g.lives<=0){g.state='over';return false}return true}};Arcade.current.def=DEF;DEF.setup(g);return g;};
module.exports=(f)=>{eval(require('fs').readFileSync(f,'utf8'))};
