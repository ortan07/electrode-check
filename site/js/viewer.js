/* ดูรูป Drawing เต็มจอ: ซูมด้วยล้อเมาส์/ปุ่ม +/−/pinch, ลากเพื่อเลื่อน, ดับเบิลคลิกเพื่อรีเซ็ต
   แสดงไฟล์ต้นฉบับ ไม่ย่อ/บีบอัดรูป เพื่อให้รายละเอียดเล็กๆ ยังอ่านได้ */
const Viewer = (() => {
  let box, img, cap, sc = 1, tx = 0, ty = 0, fit = 1;
  const pts = new Map(); let lastDist = 0;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${sc})`; $('#vzl').textContent = Math.round(sc / fit * 100) + '%'; };
  const reset = () => {
    const W = box.clientWidth, H = box.clientHeight - 48, w = img.naturalWidth, h = img.naturalHeight;
    fit = Math.min(W / w, H / h); sc = fit; tx = (W - w * sc) / 2; ty = 48 + (H - h * sc) / 2; apply();
  };
  const zoomAt = (f, cx, cy) => {
    const n = Math.min(Math.max(sc * f, fit * .5), fit * 12);
    tx = cx - (cx - tx) * (n / sc); ty = cy - (cy - ty) * (n / sc); sc = n; apply();
  };
  function build() {
    box = document.createElement('div'); box.id = 'viewer'; box.hidden = true;
    box.innerHTML = `<div class="vbar"><span id="vcap"></span><span class="sp"></span>
      <button class="btn" data-v="out">−</button><span id="vzl">100%</span><button class="btn" data-v="in">＋</button>
      <button class="btn" data-v="reset">พอดีจอ</button><button class="btn" data-v="x">ปิด ✕</button></div><img alt="" draggable="false">`;
    document.body.appendChild(box); img = box.querySelector('img'); cap = box.querySelector('#vcap');
    box.addEventListener('click', e => {
      const v = e.target.dataset.v; if (!v) return;
      const cx = box.clientWidth / 2, cy = box.clientHeight / 2;
      if (v === 'in') zoomAt(1.4, cx, cy); else if (v === 'out') zoomAt(1 / 1.4, cx, cy); else if (v === 'reset') reset(); else close();
    });
    box.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY); }, { passive: false });
    img.addEventListener('dblclick', reset);
    img.addEventListener('pointerdown', e => { img.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); lastDist = 0; });
    img.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const p = pts.get(e.pointerId);
      if (pts.size === 1) { tx += e.clientX - p[0]; ty += e.clientY - p[1]; apply(); }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (lastDist) zoomAt(d / lastDist, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); lastDist = d;
      }
    });
    const up = e => { pts.delete(e.pointerId); lastDist = 0; };
    img.addEventListener('pointerup', up); img.addEventListener('pointercancel', up);
    document.addEventListener('keydown', e => { if (!box.hidden) { if (e.key === 'Escape') close(); else if (e.key === '+') zoomAt(1.4, box.clientWidth / 2, box.clientHeight / 2); else if (e.key === '-') zoomAt(1 / 1.4, box.clientWidth / 2, box.clientHeight / 2); } });
    window.addEventListener('resize', () => { if (!box.hidden) reset(); });
  }
  function close() { box.hidden = true; document.body.style.overflow = ''; }
  function open(src, title) {
    if (!box) build();
    cap.textContent = title || ''; box.hidden = false; document.body.style.overflow = 'hidden';
    img.onload = reset; img.src = src; if (img.complete && img.naturalWidth) reset();
  }
  return { open };
})();
