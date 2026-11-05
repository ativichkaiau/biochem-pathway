// The diagram and map share the same bounded carrier model and inhibitor state.
window.ElectronFlowUI = (() => {
  const redox = new Set(['nad','fad','fmn','coq']);
  const inhibitors = {I:'Complex I',II:'Complex II',III:'Complex III',IV:'Complex IV',V:'ATP Synthase'};
  let state, frame = 0, lastTime = 0, lastPaint = 0, paused = false, returnToExplorer = false;
  let settings = {nadh:true,succinate:true,oxygen:1}, cachedKey = '', cachedRates;
  const root = () => document.getElementById('electron-flow-modal');
  const isOpen = () => !!root()?.classList.contains('open');
  function config() {
    return {
      ...settings, mitochondria: currentCell().id !== 'rbc',
      oxygen: activePerturbations.has('hypoxia') ? 0 : settings.oxygen,
      blocked: Object.fromEntries(Object.entries(inhibitors).map(([key,name]) => [key,getEdgeEnzymeStatus(name)==='inhibited'])),
      uncoupled:activePerturbations.has('dnp')
    };
  }
  function edgeKey(edge) {
    if (edge.e === 'e⁻') return edge.from === 'NADH' ? 'I' : edge.from === 'FADH2' ? 'II' : edge.from === 'CoQH2' ? 'III' : null;
    return edge.e === 'Complex IV' ? 'IV' : null;
  }
  function mapRates() {
    const options = config(), key = JSON.stringify(options);
    if (key !== cachedKey) { cachedKey = key; cachedRates = ElectronTransport.settled(options).rates; }
    return cachedRates;
  }
  function diagram() {
    const compact = matchMedia('(max-width: 820px)').matches;
    const positions = compact ? [[80,48],[80,136],[252,48],[252,136],[166,230],[166,318],[166,406],[166,494],[166,582]] : [[74,80],[257,80],[74,240],[257,240],[431,160],[563,160],[687,160],[811,160],[811,280]];
    const labels = [['NADH → NAD⁺','2 e⁻'],['I · FMN / Fe–S','4 H⁺ / 2 e⁻'],['Succinate','→ Fumarate'],['II · FAD / Fe–S','0 H⁺'],['CoQ / CoQH₂','2 e⁻'],['III · Q cycle','4 H⁺ / 2 e⁻'],['Cytochrome c','1 e⁻'],['IV · heme / Cu','2 H⁺ / 2 e⁻'],['O₂ → H₂O','4 e⁻ / O₂']];
    const routes = [[0,1,'I'],[1,4,'I'],[2,3,'II'],[3,4,'II'],[4,5,'III'],[5,6,'III'],[6,7,'IV'],[7,8,'IV']];
    const keyNode = {nad:0,fmn:1,fad:3,coq:4}[returnToExplorer ? coenzymeDetailId : selectedCoenzymeId];
    const paths = routes.map(([from,to,key]) => {
      const [ax,ay]=positions[from], [bx,by]=positions[to];
      const vertical = compact || from===7;
      const x1=vertical?ax:ax+55, y1=vertical?ay+24:ay;
      const x2=vertical?bx:bx-55, y2=vertical?by-24:by;
      const d=`M ${x1} ${y1} L ${x2} ${y2}`;
      return `<g data-electron-route="${key}"><path class="electron-track" d="${d}" marker-end="url(#electron-arrow)"/>`+
        [0,1].map(i=>`<circle class="electron-dot" r="3.5" style="offset-path:path('${d}');animation-delay:${-i*.8}s"/>`).join('')+
        `<text class="electron-stop" x="${(x1+x2)/2}" y="${(y1+y2)/2+5}" text-anchor="middle">×</text></g>`;
    }).join('');
    const nodes = labels.map(([label,sub],i)=>{
      const [x,y]=positions[i];
      return `<g class="electron-carrier${i===keyNode?' carrier-selected':''}" transform="translate(${x},${y})"><rect x="-57" y="-24" width="114" height="48" rx="12"/><text text-anchor="middle" y="-3">${label}</text><text class="electron-sub" text-anchor="middle" y="14">${sub}</text></g>`;
    }).join('');
    document.getElementById('electron-diagram').classList.toggle('electron-vertical',compact);
    document.getElementById('electron-diagram').innerHTML=`<svg viewBox="0 0 ${compact?'332 620':'895 320'}" role="img" aria-labelledby="electron-svg-title"><title id="electron-svg-title">${escapeText(I18N.t('NADH and succinate transfer electrons through CoQ, Complex III, cytochrome c and Complex IV to oxygen.'))}</title><defs><marker id="electron-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>${paths}${nodes}</svg>`;
  }
  function paint() {
    if (!isOpen()) return;
    const options=config(), r=state.rates, noMito=!options.mitochondria;
    root().classList.toggle('electron-paused',paused);
    root().classList.toggle('electron-no-mito',noMito);
    document.getElementById('electron-pause').textContent=paused?'Resume model':'Pause model';
    document.getElementById('electron-pause').setAttribute('aria-pressed',String(paused));
    const note = noMito ? 'Mature red cells have no mitochondria: no respiratory electron flow or oxidative ATP synthesis.' : options.oxygen===0 ? 'No oxygen acceptor: reduced carriers accumulate and respiratory flow stops as the chain fills.' : options.blocked.IV ? 'Complex IV is blocked: electrons cannot reach oxygen; upstream carriers accumulate.' : options.blocked.III ? 'Complex III is blocked: QH₂ accumulates while cytochrome c becomes oxidized.' : options.uncoupled ? 'Proton leak uncouples respiration from ATP synthesis. Electron flow can recover even with oligomycin; ATP synthase remains blocked by oligomycin.' : options.blocked.V ? 'ATP synthase is blocked: the gradient builds and backpressure slows electron flow.' : options.blocked.I ? 'Complex I is blocked. Succinate can still feed CoQ through Complex II.' : options.blocked.II ? 'Complex II is blocked. NADH can still feed CoQ through Complex I.' : 'Electrons reach oxygen; the proton gradient drives ATP synthase. Carrier pools adjust to donor supply.';
    const status=document.getElementById('electron-status');
    if(status.textContent!==I18N.t(note)) {status.textContent=note;I18N.apply(status);}
    document.getElementById('electron-cell').textContent=currentCell().tab;
    document.getElementById('electron-oxygen-value').textContent=`${Math.round(options.oxygen*100)}%`;
    document.getElementById('electron-oxygen').disabled=activePerturbations.has('hypoxia');
    document.querySelectorAll('[data-electron-pert]').forEach(button=>button.setAttribute('aria-pressed',String(activePerturbations.has(button.dataset.electronPert))));
    const metrics={nadh:state.nadh/ElectronTransport.capacity,q:state.q/ElectronTransport.capacity,cyt:state.cyt/ElectronTransport.capacity,gradient:state.protons/ElectronTransport.protonCapacity};
    for(const [name,value] of Object.entries(metrics)) {
      const row=document.querySelector(`[data-electron-meter="${name}"]`);
      row.querySelector('span').style.width=`${noMito?0:Math.min(100,value*100)}%`;
      row.querySelector('output').textContent=noMito?'—':`${Math.round(value*100)}%`;
    }
    document.getElementById('electron-oxygen-rate').textContent=noMito?'—':(r.IV/4).toFixed(2);
    document.getElementById('electron-atp-rate').textContent=noMito?'—':r.atp.toFixed(2);
    for(const group of document.querySelectorAll('[data-electron-route]')) {
      const key=group.dataset.electronRoute, rate=noMito?0:r[key];
      group.classList.toggle('route-blocked',!!options.blocked[key] || (key==='IV'&&options.oxygen===0) || noMito);
      group.classList.toggle('route-idle',rate<.015);
      group.querySelectorAll('.electron-dot').forEach(dot=>dot.style.animationDuration=`${Math.max(.7,Math.min(8,3/Math.max(.1,rate)))}s`);
    }
    I18N.apply(root());
  }
  function tick(time) {
    frame=0;
    if(!isOpen() || paused || document.hidden) {lastTime=0;return;}
    if(lastTime) ElectronTransport.step(state,Math.min(.1,(time-lastTime)/1000)*3,config());
    lastTime=time;
    if(time-lastPaint>160){paint();lastPaint=time;}
    frame=requestAnimationFrame(tick);
  }
  function run() {cancelAnimationFrame(frame);frame=0;lastTime=0;if(isOpen()&&!paused&&!document.hidden)frame=requestAnimationFrame(tick);}
  function open() {
    returnToExplorer=coenzymesOpen();
    if(returnToExplorer)closeCoenzymes();
    state=ElectronTransport.create(); paused=false;
    root().classList.add('open');root().setAttribute('aria-hidden','false');
    diagram();paint();beginModal(root(),'#electron-close');run();
  }
  function close() {
    cancelAnimationFrame(frame);frame=0;lastTime=0;
    root().classList.remove('open');root().setAttribute('aria-hidden','true');endModal(root());
    if(returnToExplorer){openCoenzymes();document.getElementById('electron-flow-open').focus({preventScroll:true});}
  }
  function resetSupplies() {
    settings={nadh:true,succinate:true,oxygen:1};
    document.querySelectorAll('[data-electron-source]').forEach(input=>{input.checked=true;});
    document.getElementById('electron-oxygen').value='100';
    if(isOpen()){state=ElectronTransport.create();paint();run();}
  }
  function init() {
    document.getElementById('electron-flow-open').addEventListener('click',open);
    document.getElementById('electron-map-open').addEventListener('click',open);
    document.getElementById('electron-close').addEventListener('click',close);
    root().addEventListener('click',e=>{if(e.target===root())close();});
    document.getElementById('electron-pause').addEventListener('click',()=>{paused=!paused;paint();run();});
    document.getElementById('electron-restart').addEventListener('click',()=>{state=ElectronTransport.create();paint();run();});
    root().querySelectorAll('[data-electron-source]').forEach(input=>input.addEventListener('change',()=>{settings[input.dataset.electronSource]=input.checked;renderEdges();paint();}));
    document.getElementById('electron-oxygen').addEventListener('input',e=>{settings.oxygen=Number(e.target.value)/100;renderEdges();paint();});
    root().querySelectorAll('[data-electron-pert]').forEach(button=>button.addEventListener('click',()=>{
      const id=button.dataset.electronPert;
      if(activePerturbations.has(id))activePerturbations.delete(id);else activePerturbations.add(id);
      renderPerturbationList();renderAll();paint();
    }));
    addEventListener('resize',()=>{if(isOpen()){diagram();paint();}});
    document.addEventListener('visibilitychange',run);
    document.addEventListener('languagechange',()=>{if(isOpen()){diagram();paint();}});
  }
  return {init,open,close,isOpen,edgeKey,mapRates,resetSupplies,isRedox:id=>redox.has(id)};
})();
