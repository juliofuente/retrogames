// ═══ ABN kit · shared helpers for the ABN games added in v2.9 (doble recta, detracción, problemas…) ═══
// Load it after defining H (the hub) and before the game script:  <script src="abnkit.js"></script>
// Everything is exposed as window.ABN. Texts: ABN.L(g,TX) picks es/en (fr falls back to en).
(function(){
const H=window.parent&&window.parent!==window?window.parent.Hub:null;if(!H)return;
const {ri,pick,shuf,intChoices}=H.U;
const NS='http://www.w3.org/2000/svg';
const CSS=`
.abn{width:100%;max-width:460px;margin:0 auto;border-collapse:separate;border-spacing:0;font-family:'Fredoka One',ui-rounded,'Nunito',system-ui,sans-serif;font-size:clamp(1rem,4.4vmin,1.3rem);background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 12px rgba(45,42,74,.08)}
.abn th{background:#FF6B9D;color:#fff;font-size:.78rem;padding:6px 4px;font-family:'Nunito',sans-serif;font-weight:900}
.abn td{text-align:center;padding:5px 4px;border-top:2px solid #f1eef8}.abn td.q{color:var(--purple);background:#f3edff}.abn tr.new td{animation:kpop .35s}
.ask{text-align:center;font-weight:900;font-size:clamp(.95rem,4.1vmin,1.12rem);line-height:1.3}
.big{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;font-family:'Fredoka One',ui-rounded,'Nunito',system-ui,sans-serif;font-size:clamp(1.7rem,8.5vmin,2.6rem)}
.big b{background:#ffd93d;border-radius:14px;padding:0 12px;font-weight:400}.big i{font-style:normal;color:var(--purple);background:#f3edff;border-radius:14px;padding:0 12px;border:3px dashed var(--lilac)}
.story{background:#fff;border-radius:16px;padding:10px 14px;font-weight:800;font-size:clamp(1rem,4.3vmin,1.2rem);line-height:1.4;text-align:center;box-shadow:0 4px 12px rgba(45,42,74,.08);max-width:520px;margin:0 auto}
.emo{display:flex;flex-wrap:wrap;justify-content:center;gap:2px;font-size:clamp(1.2rem,5.4vmin,1.7rem);line-height:1.15;max-width:480px;margin:0 auto}
.emo.sm{font-size:clamp(.95rem,4.2vmin,1.3rem)}
.nline{width:100%;max-width:660px;margin:0 auto;display:block;overflow:visible}
.nline text{font-family:'Fredoka One',ui-rounded,'Nunito',system-ui,sans-serif;font-size:46px;fill:#2d2a4a;text-anchor:middle}
.nline .jl{font-size:42px}
.k-choice{font-size:clamp(1.25rem,5.4vmin,1.85rem)}
.tag{display:inline-block;background:#f3edff;color:var(--purple);border-radius:999px;padding:1px 10px;font-weight:900;font-size:.8rem}
`;
const ABN={CSS,ri,pick,shuf,
  L(g,TX){return TX[g.lang]||(g.lang==='fr'?TX.en:null)||TX.es;},
  // distinct numeric options containing ans
  opts(r,ans,dis,n=4,min=0){return intChoices(r,[ans],dis.filter(x=>x!==ans),n,min);},
  // one-question round: choose the right number among options, then g.solved()
  ask(g,ans,dis,onRight,parent,n){
    return g.choices(ABN.opts(g.r,ans,dis,n||4,0),(v,b)=>{b.textContent=v;},(v,b)=>{if(v!==ans){g.bad(b);return;}
      b.classList.add('k-right');g.fx.stars(b);if(onRight)onRight(v,b);g.solved();},n||4,parent);
  },
  // guided multi-step table (ABN "rejilla"): steps [{ask, ans, dis, row:[…], qi}] — row is the full row, qi the cell with the answer;
  // cells after qi stay hidden until the step is answered. fin(): optional callback after the last step (default g.solved()).
  steps(g,heads,steps,fin,startRow){
    const tb=g.el('table','abn','<tr>'+heads.map(h=>`<th>${h}</th>`).join('')+'</tr>'+(startRow?'<tr>'+startRow.map(c=>`<td>${c}</td>`).join('')+'</tr>':''),g.stage);
    const ask=g.el('div','ask','',g.stage),box=g.el('div','k-ans',null,g.stage);let i=0;
    const go=()=>{box.innerHTML='';const s=steps[i];ask.innerHTML=s.ask;
      const tr=g.el('tr','new',s.row.map((c,j)=>j===s.qi?'<td class="q">?</td>':`<td>${j>s.qi&&!s.show?'':c}</td>`).join(''),tb);
      g.choices(ABN.opts(g.r,s.ans,s.dis||[s.ans+1,s.ans-1,s.ans+10,s.ans-10],4,0),(v,b)=>{b.textContent=v;},(v,b)=>{
        if(v!==s.ans){g.bad(b);return;}box.querySelectorAll('button').forEach(x=>x.disabled=true);
        [...tr.children].forEach((td,j)=>{td.textContent=s.row[j];td.classList.remove('q');});i++;
        if(i>=steps.length){b.classList.add('k-right');g.fx.stars(b);ask.innerHTML=s.done||'';if(fin)fin();else g.solved();}else{g.good(b);setTimeout(go,380);}},4,box);
      if(g.refit)g.refit();};
    go();return tb;
  },
  // quick burst of items in one round: [{q (prompt), big (html, <i>?</i> = hole), ans, dis, vis(parent), min}]
  burst(g,items){
    const prog=g.el('div','ask','',g.stage),big=g.el('div','big',null,g.stage),vis=g.el('div',null,null,g.stage),box=g.el('div','k-ans',null,g.stage);let i=0;
    const show=()=>{const it=items[i];g.prompt(it.q);prog.textContent=items.length>1?`${i+1} / ${items.length}`:'';big.innerHTML=it.big||'';vis.innerHTML='';if(it.vis)it.vis(vis);box.innerHTML='';
      g.choices(ABN.opts(g.r,it.ans,it.dis,4,it.min||0),(v,b)=>{b.textContent=v;},(v,b)=>{
        if(v!==it.ans){g.bad(b);return;}box.querySelectorAll('button').forEach(x=>x.disabled=true);const q=big.querySelector('i');if(q)q.textContent=it.ans;
        i++;if(i>=items.length){b.classList.add('k-right');g.fx.stars(b);g.solved();}else{g.good(b);setTimeout(show,550);}},4,box);
      if(g.refit)g.refit();};
    show();
  },
  // SVG number line: o={lo,hi,step,label(v)→bool, h} → {svg,X,mk,mark(v,col,txt,up),jump(a,b,txt,col,up)}
  line(g,o,parent){
    const doc=g.doc,svg=doc.createElementNS(NS,'svg'),H0=(o.h||150)+40;svg.setAttribute('viewBox',`-40 0 1080 ${H0}`);svg.setAttribute('class','nline');(parent||g.stage).appendChild(svg);
    const y=o.y||(H0-70),X=v=>(v-o.lo)/(o.hi-o.lo)*1000;
    const mk=(t,a,p)=>{const e=doc.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);(p||svg).appendChild(e);return e;};
    mk('line',{x1:-20,y1:y,x2:1020,y2:y,stroke:'#2d2a4a','stroke-width':6,'stroke-linecap':'round'});
    if(o.step)for(let v=Math.ceil(o.lo/o.step)*o.step;v<=o.hi;v+=o.step){const big=o.label?o.label(v):true;
      mk('line',{x1:X(v),y1:y-(big?18:10),x2:X(v),y2:y+(big?18:10),stroke:'#2d2a4a','stroke-width':big?5:3});
      if(big){const t=mk('text',{x:X(v),y:y+62});t.textContent=v;}}
    const L={svg,X,mk,y,
      mark(v,col,txt){const m=mk('circle',{cx:X(v),cy:y,r:18,fill:col||'#FF6B9D',stroke:'#fff','stroke-width':4});
        if(txt!=null){const t=mk('text',{x:X(v),y:y-30});t.textContent=txt;t.setAttribute('fill',col||'#FF6B9D');}return m;},
      jump(a,b,txt,col){const x1=X(a),x2=X(b),mx=(x1+x2)/2,hgt=Math.min(70,20+Math.abs(x2-x1)*.3);
        mk('path',{d:`M${x1} ${y-8} Q${mx} ${y-8-hgt*2} ${x2} ${y-8}`,fill:'none',stroke:col||'#9B5CFF','stroke-width':5,'stroke-dasharray':'2 0'});
        const t=mk('text',{x:mx,y:y-8-hgt-6,class:'jl'});t.textContent=txt;t.setAttribute('fill',col||'#9B5CFF');}};
    return L;
  },
  // emoji groups: n emojis, optional grouping of 10 (haces)
  emojis(g,n,e,parent,cls){const d=g.el('div','emo'+(cls?' '+cls:''),null,parent||g.stage);d.textContent=e.repeat(n);return d;},
  roundUp(n,b){return Math.ceil(n/b)*b;},
  // range + ticks for a number line that shows a..b comfortably
  scale(a,b){let lo=Math.min(a,b),hi=Math.max(a,b);const u=hi-lo<=30?10:hi-lo<=250?50:100;
    lo=Math.max(0,Math.floor(lo/u)*u);hi=Math.ceil(hi/u)*u;if(hi===lo)hi+=u;const span=hi-lo;
    return{lo,hi,step:span<=40?1:span<=300?10:50,label:span<=40?(v=>v%10===0):span<=300?(v=>v%50===0):(v=>v%100===0)};},
  // ABN jumps on the empty number line: first to the round ten, then hundreds, tens and units
  jumpPlan(a,b,sign,D){
    if(D<1.5)return Array(b).fill(1);
    const J=[];let cur=a,left=b;const toR=sign>0?(10-cur%10)%10:cur%10;
    if(D>=2.5&&toR&&toR<left){J.push(toR);left-=toR;cur+=sign*toR;}
    const h=Math.floor(left/100)*100;if(h){J.push(h);left-=h;}
    const t=Math.floor(left/10)*10;if(t){J.push(t);left-=t;}
    if(left)J.push(left);return J;},
  fmt(n){return String(n);}
};
window.ABN=ABN;
})();
