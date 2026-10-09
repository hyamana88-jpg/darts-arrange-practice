/* Standard clockwise board: 20 at twelve o'clock, with separate scoring rings. */
(function(root){
  const NUMBERS=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
  const NS='http://www.w3.org/2000/svg';
  function label(token){
    if(token==='BULL') return 'ブル（50点）';
    if(token==='SB') return 'シングルブル（25点）';
    if(token==='MISS') return 'ミス（0点）';
    return {S:'シングル',D:'ダブル',T:'トリプル'}[token[0]]+' '+token.slice(1);
  }
  function point(radius,angle){const a=angle*Math.PI/180;return [200+radius*Math.sin(a),200-radius*Math.cos(a)];}
  function sector(inner,outer,start,end){
    const a=point(outer,start),b=point(outer,end),c=point(inner,end),d=point(inner,start);
    return `M${a} A${outer},${outer} 0 0 1 ${b} L${c} A${inner},${inner} 0 0 0 ${d} Z`;
  }
  function element(name,attrs){const el=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;}
  function mount(host,onHit){
    host.textContent='';
    const svg=element('svg',{viewBox:'0 0 400 400','aria-label':'ダーツボード。上が20、時計回りに1、18、4。各エリアをタップして入力。',role:'group'});
    svg.appendChild(element('circle',{cx:200,cy:200,r:198,fill:'#111827'}));
    function hit(el,token,extra=''){
      el.dataset.token=token;el.classList.add('boardHit');
      el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label',label(token)+extra);
      const select=()=>{if(el.getAttribute('aria-disabled')!=='true'){onHit(el.dataset.token);svg.querySelectorAll('.selectedHit').forEach(e=>e.classList.remove('selectedHit'));el.classList.add('selectedHit');}};
      el.addEventListener('click',select);el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});
      svg.appendChild(el);
    }
    NUMBERS.forEach((number,index)=>{
      const start=index*18-9,end=start+18;
      const pale=index%2===1;
      for(const [prefix,inner,outer,extra] of [['S',30,88,'（内側）'],['T',88,116,''],['S',116,144,'（外側）'],['D',144,174,'']]){
        const fill=prefix==='S' ? pale?'#f3e8d0':'#20252e' : pale?'#15803d':'#dc2626';
        hit(element('path',{d:sector(inner,outer,start,end),fill,stroke:'#b4bdc8','stroke-width':0.8}),prefix+number,extra);
      }
      const [x,y]=point(186,index*18);
      const text=element('text',{x,y,'text-anchor':'middle','dominant-baseline':'central',fill:'#fff','font-size':16,'font-weight':700,'pointer-events':'none'});
      text.textContent=number;svg.appendChild(text);
    });
    const outer=element('circle',{cx:200,cy:200,r:30,fill:'#15803d',stroke:'#b4bdc8','stroke-width':0.8});outer.dataset.outerBull='true';hit(outer,'SB');
    hit(element('circle',{cx:200,cy:200,r:16,fill:'#dc2626',stroke:'#b4bdc8','stroke-width':0.8}),'BULL');
    host.appendChild(svg);
  }
  function update(host,mode,locked,lastToken){
    host.querySelectorAll('.selectedHit').forEach(el=>{if(el.dataset.token!==lastToken)el.classList.remove('selectedHit');});
    const outer=host.querySelector('[data-outer-bull]');
    if(outer){outer.dataset.token=mode==='sep_double'?'SB':'BULL';outer.setAttribute('aria-label',label(outer.dataset.token));}
    host.querySelectorAll('.boardHit').forEach(el=>{el.setAttribute('aria-disabled',String(locked));el.setAttribute('tabindex',locked?'-1':'0');});
  }
  root.Dartboard={mount,update,label,NUMBERS};
})(globalThis);
