/* Flow จัดการหัวเชื่อม NG: ปุ่ม "Flow NG" บนแถบบน เปิดแผนภาพเต็มจอ (Esc หรือกดพื้นหลังเพื่อปิด) */
const FlowNG = (() => {
  document.head.insertAdjacentHTML('beforeend', '<style>#flowng{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:12px}#flowng[hidden]{display:none}#flowng .fbox{background:var(--card);color:var(--tx);border:1px solid var(--bd);border-radius:12px;width:min(640px,100%);max-height:100%;overflow:auto;padding:12px 16px 16px}#flowng .fh{display:flex;align-items:center;gap:8px;margin-bottom:8px}#flowng .fh h3{flex:1;margin:0;font-size:16px}#flowng svg{display:block;width:100%;height:auto}#flowng .th{font-size:14px;font-weight:600;fill:var(--tx)}#flowng .ts{font-size:12px;fill:var(--mu)}#flowng .lb{font-size:12px;fill:var(--mu)}#flowng .g rect{fill:var(--bg);stroke:var(--mu)}#flowng .r rect{fill:rgba(220,38,38,.14);stroke:var(--ng)}#flowng .n rect{fill:rgba(34,160,90,.16);stroke:#22a05a}#flowng .arr{stroke:var(--mu);stroke-width:1.5;fill:none}#flowng .loop{stroke:var(--ng)}</style>');
  const SVG = `<svg viewBox="0 0 680 634" role="img" aria-label="โฟลว์หัวเชื่อม NG ส่ง Material Shop">
<defs><marker id="fa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>
<g class="g"><rect x="220" y="20" width="240" height="44" rx="8"/><text class="th" x="340" y="42" text-anchor="middle" dominant-baseline="central">วัดหัวเชื่อม + คีย์ค่าในเว็บ</text></g>
<line x1="340" y1="64" x2="340" y2="92" class="arr" marker-end="url(#fa)"/>
<g class="g"><rect x="220" y="94" width="240" height="44" rx="8"/><text class="th" x="340" y="116" text-anchor="middle" dominant-baseline="central">ค่า + Appearance OK ไหม?</text></g>
<line x1="220" y1="116" x2="192" y2="116" class="arr" marker-end="url(#fa)"/>
<text class="lb" x="206" y="104" text-anchor="middle">OK</text>
<g class="n"><rect x="30" y="94" width="160" height="44" rx="8"/><text class="th" x="110" y="116" text-anchor="middle" dominant-baseline="central">OK: ใช้งานต่อ</text></g>
<line x1="340" y1="138" x2="340" y2="166" class="arr" marker-end="url(#fa)"/>
<text class="lb" x="352" y="153">NG</text>
<g class="r"><rect x="220" y="168" width="240" height="56" rx="8"/><text class="th" x="340" y="186" text-anchor="middle" dominant-baseline="central">ถ่ายรูป NG Appearance</text><text class="ts" x="340" y="206" text-anchor="middle" dominant-baseline="central">รูปแยก up / low</text></g>
<line x1="340" y1="224" x2="340" y2="252" class="arr" marker-end="url(#fa)"/>
<g class="r"><rect x="220" y="254" width="240" height="44" rx="8"/><text class="th" x="340" y="276" text-anchor="middle" dominant-baseline="central">แยกใส่ถุง / กล่อง NG</text></g>
<line x1="340" y1="298" x2="340" y2="326" class="arr" marker-end="url(#fa)"/>
<g class="r"><rect x="220" y="328" width="240" height="44" rx="8"/><text class="th" x="340" y="350" text-anchor="middle" dominant-baseline="central">บันทึกในระบบ + แจ้ง Material Shop</text></g>
<line x1="340" y1="372" x2="340" y2="400" class="arr" marker-end="url(#fa)"/>
<g class="r"><rect x="220" y="402" width="240" height="44" rx="8"/><text class="th" x="340" y="424" text-anchor="middle" dominant-baseline="central">นำส่ง Material Shop ซ่อม</text></g>
<line x1="340" y1="446" x2="340" y2="474" class="arr" marker-end="url(#fa)"/>
<g class="g"><rect x="220" y="476" width="240" height="44" rx="8"/><text class="th" x="340" y="498" text-anchor="middle" dominant-baseline="central">ซ่อมเสร็จ → ตรวจซ้ำ</text></g>
<line x1="300" y1="520" x2="225" y2="548" class="arr" marker-end="url(#fa)"/>
<line x1="380" y1="520" x2="455" y2="548" class="arr" marker-end="url(#fa)"/>
<g class="n"><rect x="130" y="550" width="190" height="56" rx="8"/><text class="th" x="225" y="578" text-anchor="middle" dominant-baseline="central">ผ่าน: กลับเข้าใช้งาน</text></g>
<g class="r"><rect x="360" y="550" width="190" height="56" rx="8"/><text class="th" x="455" y="568" text-anchor="middle" dominant-baseline="central">NG: บันทึกในระบบ</text><text class="ts" x="455" y="588" text-anchor="middle" dominant-baseline="central">และส่งซ่อมอีกครั้ง</text></g>
<path d="M550 578 L600 578 L600 276 L462 276" class="arr loop" marker-end="url(#fa)"/>
<text class="lb" x="610" y="424">วนซ้ำ</text>
</svg>`;
  let box;
  const close = () => { box.hidden = true; document.body.style.overflow = ''; };
  const open = () => {
    if (!box) {
      box = document.createElement('div'); box.id = 'flowng'; box.hidden = true;
      box.innerHTML = `<div class="fbox" role="dialog" aria-label="Flow จัดการหัวเชื่อม NG"><div class="fh"><h3>Flow จัดการหัวเชื่อม NG</h3><button class="btn" data-x>ปิด ✕</button></div>${SVG}</div>`;
      box.addEventListener('click', e => { if (e.target === box || e.target.dataset.x !== undefined) close(); });
      document.addEventListener('keydown', e => { if (!box.hidden && e.key === 'Escape') close(); });
      document.body.appendChild(box);
    }
    box.hidden = false; document.body.style.overflow = 'hidden';
  };
  const btn = document.getElementById('btnFlow');
  if (btn) btn.onclick = open;
  return { open };
})();
