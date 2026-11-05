// Qualitative, forward-only ETC model. Rates and pool sizes are illustrative,
// not fitted kinetics. Pools store electron equivalents (cyt c carries one;
// NADH and QH2 carry two). Electrons are conserved from donors to oxygen.
// CI/CIII/CIV move 4/4/2 H+ per pair; CII does not pump protons.
(() => {
  const capacity = 12, protonCapacity = 50;
  const emptyRates = () => ({I:0, II:0, III:0, IV:0, atp:0, leak:0});
  function create() {
    return {nadh:7, q:4, cyt:3, protons:15, input:0, output:0, oxygen:0, water:0, atp:0, rates:emptyRates()};
  }
  function step(s, dt, options = {}) {
    if (!Number.isFinite(dt) || dt <= 0) return s;
    // Bound substeps so a delayed frame cannot jump over a carrier capacity.
    const count = Math.ceil(Math.min(dt, 1) / .025), h = Math.min(dt, 1) / count;
    const totals = emptyRates();
    for (let i=0; i<count; i++) {
      if (options.mitochondria === false) continue;
      const blocked = options.blocked || {};
      const n = s.nadh/capacity, q = s.q/capacity, c = s.cyt/capacity;
      const gradient = s.protons/protonCapacity;
      const pressure = Math.max(0, 1-gradient) ** 2;
      const oxygen = Math.max(0, Math.min(1, options.oxygen ?? 1));
      const supply = options.nadh === false ? 0 : Math.min(capacity-s.nadh, 6*(1-n)*h);
      s.nadh += supply;
      const iv = blocked.IV ? 0 : Math.min(s.cyt, 14*c*(oxygen/(.15+oxygen))*pressure*h);
      s.cyt -= iv;
      const iii = blocked.III ? 0 : Math.min(s.q, capacity-s.cyt, 12*q*(1-c)*pressure*h);
      s.q -= iii; s.cyt += iii;
      const one = blocked.I ? 0 : Math.min(s.nadh, capacity-s.q, 7*n*(1-q)*pressure*h);
      s.nadh -= one; s.q += one;
      const two = blocked.II || options.succinate === false ? 0 : Math.min(capacity-s.q, 3*(1-q)*h);
      s.q += two;
      s.input += supply+two; s.output += iv;
      s.oxygen += iv/4; s.water += iv/2;
      // ATP synthase uses the gradient; an uncoupler provides a separate leak.
      // Four H+ per ATP is an effective teaching approximation including transport.
      const pumped = 2*one + 2*iii + iv;
      s.protons += pumped;
      const synth = blocked.V ? 0 : Math.min(s.protons, 18*gradient*h);
      s.protons -= synth;
      const leak = Math.min(s.protons, (options.uncoupled ? 160 : .5)*gradient*h);
      s.protons -= leak; s.atp += synth/4;
      totals.I += one; totals.II += two; totals.III += iii; totals.IV += iv;
      totals.atp += synth/4; totals.leak += leak;
    }
    const elapsed = count*h;
    s.rates = Object.fromEntries(Object.entries(totals).map(([key,value]) => [key,value/elapsed]));
    return s;
  }
  function settled(options = {}) {
    const s = create();
    for (let t=0; t<120; t++) step(s, 1, options);
    return s;
  }
  window.ElectronTransport = {create, step, settled, capacity, protonCapacity};
})();
