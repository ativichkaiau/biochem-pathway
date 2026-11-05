// Local dictionaries only: switching language never sends text to a translation service.
(() => {
  const dictionary = new Map(Object.entries(window.BIOCHEM_TH || {}));
  const originals = new WeakMap();
  let language = 'en';
  try { language = localStorage.getItem('biochem-language') === 'th' ? 'th' : 'en'; } catch (_) {}
  const normalize = value => String(value).replace(/\s+/g, ' ').trim();
  function translated(value) {
    const source = String(value);
    if (language !== 'th') return source;
    const text = normalize(source);
    let result = dictionary.get(text);
    if (result === undefined) {
      const rules = [
        [/^Back to (.+)$/, m => 'กลับไปที่ ' + translated(m[1])],
        [/^(.+) · Linked reactions highlighted$/, m => m[1] + ' · กำลังเน้นปฏิกิริยาที่เกี่ยวข้อง'],
        [/^(Case|Pathway|Metabolite|Toggle) · (.+)$/, m => ({Case:'กรณีศึกษา',Pathway:'วิถี',Metabolite:'เมแทบอไลต์',Toggle:'เปิด/ปิด'}[m[1]]) + ' · ' + translated(m[2])],
        [/^(Expand|Collapse) (.+)$/, m => (m[1] === 'Expand' ? 'ขยาย ' : 'ย่อ ') + translated(m[2])],
        [/^Question (\d+) of (\d+)$/, m => `คำถามที่ ${m[1]} จาก ${m[2]}`],
        [/^(\d+) teaching cases across (\d+) pathways\. Select a card to start the case loop\.$/, m => `กรณีศึกษา ${m[1]} กรณี ใน ${m[2]} วิถี เลือกการ์ดเพื่อเริ่มเรียน`],
        [/^Metabolites in this pathway \((\d+)\)$/, m => `เมแทบอไลต์ในวิถีนี้ (${m[1]})`],
        [/^(\d+(?:\.\d+)?) (months?|years?|days?|weeks?)$/, m => `${m[1]} ${{month:'เดือน',months:'เดือน',year:'ปี',years:'ปี',day:'วัน',days:'วัน',week:'สัปดาห์',weeks:'สัปดาห์'}[m[2]]}`],
        [/^Patient is (.+)\.$/, m => 'ผู้ป่วยอายุ ' + translated(m[1])],
        [/^Sex: (.+)\.$/, m => 'เพศ: ' + ({M:'ชาย',F:'หญิง'}[m[1]] || translated(m[1]))],
        [/^Expected something like: (.+)\.$/, m => 'ตัวอย่างคำตอบที่คาดหวัง: ' + m[1]],
        [/^Mention at least (\d+) of: (.+)\.$/, m => `ควรกล่าวถึงอย่างน้อย ${m[1]} ประเด็นจาก: ${m[2]}`],
        [/^Correct on attempt (\d+)$/, m => `ตอบถูกในครั้งที่ ${m[1]}`],
        [/^Revealed after (\d+) tries$/, m => `เฉลยหลังลอง ${m[1]} ครั้ง`],
        [/^Click an enzyme arrow or node on the map, or choose a step from the list\. \(Attempt (\d+) of 2\.\)$/, m => `เลือกเอนไซม์หรือเมแทบอไลต์บนแผนที่ หรือเลือกจากรายการ (ครั้งที่ ${m[1]} จาก 2 ครั้ง)`],
        [/^(\d+) hits?$/, m => `มีผล ${m[1]} จุด`],
        [/^(.+): (.+)\. Continue to labs for the full panel\.$/, m => `${translated(m[1])}: ${m[2]} ไปที่ผลตรวจเพื่อดูรายการทั้งหมด`]
      ];
      for (const [pattern, format] of rules) { const match = text.match(pattern); if (match) { result = format(match); break; } }
    }
    return result === undefined ? source : source.replace(/\S[\s\S]*\S|\S/, result);
  }
  function register(en, th) {
    if (typeof en === 'string' && typeof th === 'string') dictionary.set(normalize(en), th);
    else if (Array.isArray(en) && Array.isArray(th)) en.forEach((item, i) => register(item, th[i]));
    else if (en && th && typeof en === 'object' && typeof th === 'object') Object.keys(th).forEach(key => register(en[key], th[key]));
  }
  const excluded = node => node.parentElement?.closest('script, style, svg, kbd, [data-no-i18n], [data-user-content], .chat-msg.user');
  function update(node, key, current, write) {
    let record = originals.get(node);
    if (!record) { record = new Map(); originals.set(node, record); }
    let entry = record.get(key);
    if (!entry || current !== entry.rendered) entry = { source: current, rendered: current };
    const next = translated(entry.source);
    entry.rendered = next;
    record.set(key, entry);
    if (next !== current) write(next);
  }
  function apply(root = document.body) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      if (!excluded(root) && root.data.trim()) update(root, 'text', root.data, value => { root.data = value; });
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest('script, style, svg, [data-no-i18n], [data-user-content], .chat-msg.user')) return;
    for (const el of [root, ...root.querySelectorAll('[title], [aria-label], [placeholder], [aria-valuetext]')]) {
      if (el.closest('svg, [data-no-i18n], [data-user-content], .chat-msg.user')) continue;
      for (const key of ['title','aria-label','placeholder','aria-valuetext']) {
        if (el.hasAttribute(key)) update(el, key, el.getAttribute(key), value => el.setAttribute(key, value));
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) apply(walker.currentNode);
  }
  function syncLanguage() {
    document.documentElement.lang = language;
    for (const button of document.querySelectorAll('#language-btn, [data-language-toggle]')) {
      button.textContent = language === 'th' ? 'ไทย' : 'EN';
      button.setAttribute('aria-label', language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย');
      button.title = language === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย';
    }
    apply();
  }
  window.I18N = {
    t: translated, apply, register,
    thai: value => dictionary.get(normalize(value)) || value,
    get language() { return language; },
    setLanguage(next) {
      language = next === 'th' ? 'th' : 'en';
      try { localStorage.setItem('biochem-language', language); } catch (_) {}
      syncLanguage();
      document.dispatchEvent(new CustomEvent('languagechange'));
    },
    start() {
      const observer = new MutationObserver(records => {
        const roots = new Set();
        for (const record of records) {
          if (record.type === 'childList') record.addedNodes.forEach(node => roots.add(node));
          else roots.add(record.target);
        }
        roots.forEach(root => apply(root));
      });
      observer.observe(document.body, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','aria-valuetext']});
      syncLanguage();
      document.addEventListener('click', e => { if (e.target.closest('#language-btn, [data-language-toggle]')) this.setLanguage(language === 'en' ? 'th' : 'en'); });
    }
  };
})();
