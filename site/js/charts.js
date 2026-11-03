/* วาดกราฟของแต่ละซีต (Chart.js) – แยกสี/ข้อมูลตามวัน, ล็อกค่า LSL/USL ได้ */
const Charts = {
  list: [],
  GROUPS: [['up', 'Upper'], ['low', 'Lower']],
  TYPES: [['wc', 'Regrinding / Wire Cut'], ['new', 'New']],
  rty: r => (r.ty === 'new' ? 'new' : 'wc'),
  key: (ty, g) => (ty === 'new' ? g + '_new' : g),   // คีย์เก็บ LSL/USL: Wire Cut ใช้ up/low เดิม, New ใช้ up_new/low_new
  METRICS: [['l', 'Length (ความยาว)'], ['w', 'Width (ความกว้าง)'], ['t', 'Thickness (ความหนา)']],
  COLORS: ['#2563eb', '#16a34a', '#9333ea', '#0891b2', '#ea580c', '#db2777', '#65a30d', '#475569'],
  isNG: r => r.ok === 'NG' || r.res === 'NG',
  num: v => typeof v === 'number' && isFinite(v),
  css: n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
  median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; },

  // ค่าใหญ่กว่าค่ากลางเกิน 20 เท่า ถือว่าน่าจะพิมพ์ผิด (เช่น 5467 แทน 54.67)
  isOutlier(s, r, k) {
    const v = r[k]; if (!this.num(v)) return false;
    const vals = s.rows.filter(x => x.g === r.g && this.rty(x) === this.rty(r) && this.num(x[k])).map(x => x[k]);
    return vals.length >= 3 && v > this.median(vals) * 20;
  },
  getLim(s, g, k) { const l = s.lim && s.lim[g] && s.lim[g][k]; return l ? [l[0] ?? '', l[1] ?? '', !!l[2]] : ['', '', false]; },

  render(s, box) {
    this.list.forEach(c => c.destroy()); this.list = [];
    let h = '', skipped = [];
    this.TYPES.forEach(([ty, tn]) => this.GROUPS.forEach(([g, gn]) => {
      const key = this.key(ty, g), rs = s.rows.filter(r => this.rty(r) === ty && r.g === g); let cards = '';
      this.METRICS.forEach(([k, title]) => {
        if (!rs.some(r => this.num(r[k]))) return;
        const [a, b, lock] = this.getLim(s, key, k), dis = lock ? 'disabled' : '';
        cards += `<div class="card"><h3>${title}</h3><div class="cv"><canvas id="c_${key}_${k}"></canvas></div>
          <div class="days" id="s_${key}_${k}"></div>
          <div class="lm">LSL <input type="number" step="any" value="${a}" ${dis} data-g="${key}" data-k="${k}">
          USL <input type="number" step="any" value="${b}" ${dis} data-g="${key}" data-k="${k}">
          <button class="btn lockbtn ${lock ? 'on' : ''}" data-g="${key}" data-k="${k}">${lock ? '🔒 ล็อกแล้ว (กดเพื่อแก้)' : '🔓 ล็อกค่านี้'}</button></div></div>`;
      });
      if (cards) h += `<h2>${tn} · ${gn} · ${rs.length} ชิ้น</h2><div class="grid">${cards}</div>`;
    }));
    box.innerHTML = h || '<div class="empty">ยังไม่มีค่าที่วัด – คีย์ข้อมูลด้านบนแล้วกด Update กราฟจะขึ้นที่นี่</div>';
    this.TYPES.forEach(([ty]) => this.GROUPS.forEach(([g]) => this.METRICS.forEach(([k]) => this.plot(s, ty, g, k, skipped))));
    if (skipped.length) box.insertAdjacentHTML('afterbegin', `<div class="warn">ข้ามค่าที่น่าจะพิมพ์ผิดในกราฟ: ${skipped.join('; ')} – ดู/แก้ได้ที่ "ข้อมูลที่บันทึกแล้ว"</div>`);
  },

  plot(s, ty, g, k, skipped) {
    const key = this.key(ty, g), cv = document.getElementById(`c_${key}_${k}`); if (!cv) return;
    const pts = s.rows.filter(r => {
      if (r.g !== g || this.rty(r) !== ty || !this.num(r[k])) return false;
      if (this.isOutlier(s, r, k)) { skipped.push(`${r.d} pcs ${r.p} ${k}=${r[k]}`); return false; }
      return true;
    });
    const days = [...new Set(pts.map(r => r.d))];
    const [a, b] = this.getLim(s, key, k), la = this.num(+a) && a !== '', lb = this.num(+b) && b !== '';
    const ac = this.css('--ac'), ng = this.css('--ng'), lim = this.css('--lim'), mu = this.css('--mu'), gr = this.css('--grid');

    // สรุปรายวัน
    let chips = '';
    const ds = days.map((d, i) => {
      const col = this.COLORS[i % this.COLORS.length], rr = pts.filter(r => r.d === d), v = rr.map(r => r[k]);
      const mean = v.reduce((x, y) => x + y, 0) / v.length;
      const bys = [...new Set(rr.map(r => r.by).filter(Boolean))].join(', '), lns = [...new Set(rr.map(r => r.line).filter(Boolean))].join(', '), who = [bys, lns].filter(Boolean).join(' · ');
      const out = la && lb ? v.filter(x => x < +a || x > +b).length : null, nNG = rr.filter(r => this.isNG(r)).length;
      chips += `<div class="day"><i style="background:${col}"></i><b>${d}</b>${who ? ` · ${who}` : ''} · n=${v.length} · เฉลี่ย ${mean.toFixed(3)} · ${Math.min(...v)}–${Math.max(...v)}` +
        (out !== null ? ` · <span style="color:${out ? 'var(--ng)' : 'inherit'}">นอกขีดจำกัด ${out}</span>` : '') + (nNG ? ` · <span style="color:var(--ng)">NG ${nNG}</span>` : '') + '</div>';
      return { label: who ? `${d} (${who})` : d, data: pts.map(r => (r.d === d ? r[k] : null)), borderColor: col, backgroundColor: col, tension: .15,
        pointBackgroundColor: pts.map(r => (this.isNG(r) ? ng : col)), pointRadius: pts.map(r => (this.isNG(r) ? 7 : 4)) };
    });
    document.getElementById(`s_${key}_${k}`).innerHTML = chips;
    if (lb) ds.push({ label: 'USL', data: pts.map(() => +b), borderColor: lim, borderDash: [6, 4], pointRadius: 0, borderWidth: 1.5 });
    if (la) ds.push({ label: 'LSL', data: pts.map(() => +a), borderColor: lim, borderDash: [2, 3], pointRadius: 0, borderWidth: 1.5 });
    this.list.push(new Chart(cv, { type: 'line', data: { labels: pts.map(r => r.p), datasets: ds }, options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: mu } },
        tooltip: { callbacks: { title: t => { const r = pts[t[0].dataIndex]; return `${r.d} · ชิ้นที่ ${r.p}${r.by ? ' · ' + r.by : ''}${r.line ? ' · ' + r.line : ''}${r.ok === 'NG' ? ' · Appearance NG' : ''}${r.res === 'NG' ? ' · Result NG' : ''}`; } } } },
      scales: { x: { title: { display: true, text: 'ชิ้นที่ (pcs)', color: mu }, ticks: { color: mu }, grid: { color: gr } },
        y: { ticks: { color: mu }, grid: { color: gr } } } } }));
  }
};
