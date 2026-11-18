/* วาดกราฟของแต่ละซีต (Chart.js)
   ปรับใหม่ให้อ่านง่าย:
   - ค่าเริ่มต้น = "เรียงตามเวลา" วาดเป็นเส้นเดียว สีเดียว (ไม่ใช่ 10 กว่าเส้นซ้อนกัน)
   - คั่นวันด้วยแถบพื้นหลังสลับสี + วันที่กำกับบนแถบ
   - แกน Y ซูมเข้าหาช่วงสเปก ค่าที่ไกลมากดันไปไว้ที่ขอบกราฟ (ไม่ให้สเปกถูกบีบจนแบน)
   - มีแถบช่วงสเปก (พื้นที่ระหว่าง LSL–USL) + เส้นประ LSL/USL
   - จุดที่หลุดสเปก = ◆ แดง, จุดที่ NG = ▲ แดง (เห็นทันทีว่าผิดตรงไหน)
   - เอา legend ยาว ๆ ออก ใช้ "ชิปวัน" ใต้กราฟแทน กดเพื่อซ่อน/แสดงวันนั้นได้
   - เลือกช่วงวันที่ (3 / 7 / 14 วันล่าสุด / ทั้งหมด) และสลับแกนนอนได้
   - มีบรรทัดสรุป n / เฉลี่ย / พิสัย / นอกสเปก / NG / Cpk */
const Charts = {
  list: [],
  GROUPS: [['up', 'Upper'], ['low', 'Lower']],
  TYPES: [['wc', 'Regrinding / Wire Cut'], ['new', 'New']],
  rty: r => (r.ty === 'new' ? 'new' : 'wc'),
  key: (ty, g) => (ty === 'new' ? g + '_new' : g),   // คีย์เก็บ LSL/USL: Wire Cut ใช้ up/low เดิม, New ใช้ up_new/low_new
  METRICS: [['l', 'Length (ความยาว)'], ['w', 'Width (ความกว้าง)'], ['t', 'Thickness (ความหนา)']],
  SHORT: { l: 'Length', w: 'Width', t: 'Thickness' },
  COLORS: ['#2563eb', '#16a34a', '#9333ea', '#0891b2', '#ea580c', '#db2777', '#65a30d', '#475569'],
  isNG: r => r.ok === 'NG' || r.res === 'NG',
  num: v => typeof v === 'number' && isFinite(v),
  css: n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
  median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; },

  /* ---------- สถานะการแสดงผล (จำไว้ระหว่างใช้งาน) ---------- */
  days: 3,          // แสดงกี่วันล่าสุด (0 = ทั้งหมด)
  off: new Set(),   // วันที่ถูกกดซ่อน
  xmode: 'seq',     // 'seq' = เส้นเดียวเรียงตามเวลา (อ่านง่ายสุด) · 'pcs' = ซ้อนทุกวันบนแกนชิ้นที่
  _s: null,

  // ค่าใหญ่กว่าค่ากลางเกิน 20 เท่า ถือว่าน่าจะพิมพ์ผิด (เช่น 5467 แทน 54.67)
  isOutlier(s, r, k) {
    const v = r[k]; if (!this.num(v)) return false;
    const vals = s.rows.filter(x => x.g === r.g && this.rty(x) === this.rty(r) && this.num(x[k])).map(x => x[k]);
    return vals.length >= 3 && v > this.median(vals) * 20;
  },
  getLim(s, g, k) { const l = s.lim && s.lim[g] && s.lim[g][k]; return l ? [l[0] ?? '', l[1] ?? '', !!l[2]] : ['', '', false]; },

  /* ---------- ตัวช่วย ---------- */
  dkey: d => { const m = String(d || '').match(/(\d+)\/(\d+)\/(\d+)/); return m ? +m[3] * 10000 + +m[2] * 100 + +m[1] : 0; },
  fmt(v) { return Math.abs(v) >= 10 ? v.toFixed(2) : v.toFixed(3); },
  allDays(s) { return [...new Set(s.rows.map(r => r.d))].sort((a, b) => this.dkey(a) - this.dkey(b)); },
  shownDays(s) { const a = this.allDays(s); return this.days > 0 ? a.slice(-this.days) : a; },

  // หลุดสเปกไหม (ใช้เฉพาะในกราฟ – ฝั่งคีย์ข้อมูลมี oos() ใน app.js)
  outOf(v, a, b) {
    const E = 1e-9;
    return (a !== null && v < a - E) || (b !== null && v > b + E);
  },
  cpk(vals, a, b) {
    const n = vals.length; if (n < 3 || (a === null && b === null)) return null;
    const m = vals.reduce((x, y) => x + y, 0) / n;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - m) * (v - m), 0) / (n - 1));
    if (!sd) return null;
    const hi = b !== null ? (b - m) / (3 * sd) : Infinity, lo = a !== null ? (m - a) / (3 * sd) : Infinity;
    const c = Math.min(hi, lo);
    return isFinite(c) ? c : null;
  },

  esc: v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'),
  oosOf(s, r, k) {
    if (!this.num(r[k])) return false;
    const [a, b] = this.getLim(s, this.key(this.rty(r), r.g), k);
    return this.outOf(r[k], (a !== '' && this.num(+a)) ? +a : null, (b !== '' && this.num(+b)) ? +b : null);
  },
  // ชิ้นที่ถือว่ามีปัญหา = Appearance NG / Result NG / ค่าหลุดสเปก
  ngRows(s, vis) {
    return s.rows.filter(r => vis.includes(r.d) && !this.off.has(r.d) && (this.isNG(r) || this.METRICS.some(([k]) => this.oosOf(s, r, k))))
      .sort((x, y) => this.dkey(y.d) - this.dkey(x.d) || (x.g === y.g ? 0 : x.g === 'up' ? -1 : 1) || (+x.p || 0) - (+y.p || 0));
  },
  thumbOf(r) {
    const u = r.phd || (r.ph && typeof Store !== 'undefined' && Store.photoUrl ? Store.photoUrl(r.ph) : '');
    return u ? `<img class="thumb" src="${u}" data-zoom="${u}" data-cap="รูป NG ${this.esc(r.d)} ชิ้นที่ ${r.p}" loading="lazy">` : '';
  },

  /* ---------- การ์ดสรุป NG (กราฟแท่งรายวัน + รายการทีละชิ้น) ---------- */
  ngCard(s, vis) {
    const rows = this.ngRows(s, vis);
    const head = `<div class="card ngcard"><div class="chd"><h3>🔴 สรุป NG / ค่าหลุดสเปก</h3><span class="spechip ${rows.length ? '' : 'none'}">${rows.length} ชิ้น ในช่วงวันที่ที่เลือก</span></div>`;
    if (!rows.length) return head + '<div class="okbox">ไม่มี NG และไม่มีค่าหลุดสเปกในช่วงวันที่ที่เลือก ✓</div></div>';
    const mk = this.METRICS.filter(([k]) => s.rows.some(r => this.num(r[k])));
    const body = rows.map(r => {
      const why = [];
      mk.forEach(([k]) => { if (this.oosOf(s, r, k)) why.push(`${this.SHORT[k]} หลุดสเปก`); });
      if (r.ok === 'NG') why.push('Appearance NG');
      if (r.res === 'NG' && !why.length) why.push('Result NG (ค่าไม่หลุดสเปก – ควรแก้เป็น OK)');
      return `<tr><td>${this.esc(r.d)}</td><td>${r.p}</td><td>${r.g}</td><td>${this.rty(r) === 'new' ? 'New' : 'Wire Cut'}</td>`
        + mk.map(([k]) => `<td class="${this.oosOf(s, r, k) ? 'oosc' : ''}">${this.num(r[k]) ? r[k] : '-'}</td>`).join('')
        + `<td class="cause">${why.join(' · ')}</td><td>${this.esc(r.by || '')}</td><td>${this.esc(r.rm || '')}</td><td>${this.thumbOf(r)}</td></tr>`;
    }).join('');
    return head
      + '<div class="cv ngcv"><canvas id="c_ngday"></canvas></div>'
      + `<div class="tw ngwrap"><table class="ngtbl"><thead><tr><th>วันที่</th><th>ชิ้นที่</th><th>up/low</th><th>ประเภท</th>`
      + mk.map(([, n]) => `<th>${n.split(' ')[0]}</th>`).join('')
      + `<th>สาเหตุ</th><th>ผู้บันทึก</th><th>Remark</th><th>รูป</th></tr></thead><tbody>${body}</tbody></table></div>`
      + '<div class="chhint">แถวนี้รวมทั้งชิ้นที่ค่าหลุดสเปกและชิ้นที่ติด NG จากลักษณะภายนอก (ชิ้นที่ไม่ได้วัดค่าก็จะเห็นที่นี่) · กดรูปเพื่อขยาย</div></div>';
  },
  plotNG(s, vis) {
    const cv = document.getElementById('c_ngday'); if (!cv) return;
    const days = vis.filter(d => !this.off.has(d));
    const cnt = (d, f) => s.rows.filter(r => r.d === d && f(r)).length;
    const ng = this.css('--ng') || '#dc2626', lim = this.css('--lim') || '#d97706', mu = this.css('--mu'), gr = this.css('--grid');
    this.list.push(new Chart(cv, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [
          { label: 'ค่าหลุดสเปก', data: days.map(d => cnt(d, r => this.METRICS.some(([k]) => this.oosOf(s, r, k)))), backgroundColor: ng },
          { label: 'Appearance NG', data: days.map(d => cnt(d, r => r.ok === 'NG')), backgroundColor: lim },
          { label: 'Result NG', data: days.map(d => cnt(d, r => r.res === 'NG')), backgroundColor: '#6366f1' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        datasets: { bar: { maxBarThickness: 26 } },
        plugins: { legend: { labels: { color: mu, boxWidth: 12, boxHeight: 12, font: { size: 11 } } } },
        scales: {
          x: { ticks: { color: mu, font: { size: 11 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: mu, precision: 0 }, grid: { color: gr }, title: { display: true, text: 'จำนวนชิ้น', color: mu, font: { size: 11 } } }
        }
      }
    }));
  },

  /* ---------- แถบควบคุมด้านบนกราฟ ---------- */
  ctlBar(all, vis) {
    const opt = [[3, '3 วันล่าสุด'], [7, '7 วันล่าสุด'], [14, '14 วันล่าสุด'], [0, 'ทั้งหมด']];
    return `<div class="chctl"><span class="lbl">ช่วงวันที่:</span>`
      + opt.map(([v, n]) => `<button class="tgl ${this.days === v ? 'on' : ''}" data-days="${v}">${n}</button>`).join('')
      + `<span class="sep"></span><span class="lbl">แกนนอน:</span>`
      + `<button class="tgl ${this.xmode === 'seq' ? 'on' : ''}" data-x="seq">เรียงตามเวลา (อ่านง่าย)</button>`
      + `<button class="tgl ${this.xmode === 'pcs' ? 'on' : ''}" data-x="pcs">ซ้อนตามชิ้นที่</button>`
      + `<span class="note">แสดง ${vis.length} จาก ${all.length} วัน${this.off.size ? ` · ซ่อนอยู่ ${this.off.size} วัน` : ''}</span></div>`
      + `<div class="chhint">วิธีอ่านกราฟ: เส้นประส้ม = LSL/USL · พื้นที่เขียวจาง = ช่วงที่อยู่ในสเปก · ◆ แดง = ค่าหลุดสเปก · ▲ แดง = ชิ้นที่ติด NG`
      + (this.xmode === 'seq'
        ? ' · แถบพื้นหลังสลับสี = คนละวัน (วันที่กำกับอยู่บนแถบ)'
        : ' · เส้นแต่ละสี = คนละวัน (ถ้าดูยากให้กด "เรียงตามเวลา")')
      + ` · ค่าที่ไกลจากสเปกมากจะถูกแสดงไว้ที่ขอบกราฟ · กดชิปวันใต้กราฟเพื่อซ่อน/แสดงวันนั้น</div>`;
  },

  bind(box) {
    if (box._chb) return; box._chb = 1;
    box.addEventListener('click', e => {
      const t = e.target.closest('[data-days],[data-x],[data-day]'); if (!t || !this._s) return;
      if (t.dataset.days !== undefined) { this.days = +t.dataset.days; this.off.clear(); }
      else if (t.dataset.x) this.xmode = t.dataset.x;
      else { const d = t.dataset.day; this.off.has(d) ? this.off.delete(d) : this.off.add(d); }
      this.render(this._s, box);
    });
  },

  /* ---------- วาดทั้งหน้า ---------- */
  render(s, box) {
    this._s = s; this.bind(box);
    this.list.forEach(c => c.destroy()); this.list = [];
    if (!s.rows.length) { box.innerHTML = '<div class="empty">ยังไม่มีค่าที่วัด – คีย์ข้อมูลด้านบนแล้วกด Update กราฟจะขึ้นที่นี่</div>'; return; }

    const all = this.allDays(s), vis = this.shownDays(s), skipped = [];
    let h = this.ctlBar(all, vis) + this.ngCard(s, vis), any = false;
    this.TYPES.forEach(([ty, tn]) => this.GROUPS.forEach(([g, gn]) => {
      const key = this.key(ty, g);
      const rs = s.rows.filter(r => this.rty(r) === ty && r.g === g && vis.includes(r.d));
      let cards = '';
      this.METRICS.forEach(([k, title]) => {
        if (!rs.some(r => this.num(r[k]))) return;
        const [a, b, lock] = this.getLim(s, key, k), dis = lock ? 'disabled' : '';
        const sp = (a !== '' && b !== '')
          ? `<span class="spechip">สเปก ${a} – ${b}</span>`
          : '<span class="spechip none">ยังไม่ได้ใส่สเปก</span>';
        cards += `<div class="card">
<div class="chd"><h3>${title}</h3>${sp}</div>
<div class="chsum" id="m_${key}_${k}"></div>
<div class="cv"><canvas id="c_${key}_${k}"></canvas></div>
<div class="days" id="s_${key}_${k}"></div>
<div class="lm">LSL <input type="number" step="any" value="${a}" ${dis} data-g="${key}" data-k="${k}">
USL <input type="number" step="any" value="${b}" ${dis} data-g="${key}" data-k="${k}">
<button class="btn lockbtn ${lock ? 'on' : ''}" data-g="${key}" data-k="${k}">${lock ? '🔒 ล็อกแล้ว (กดเพื่อแก้)' : '🔓 ล็อกค่านี้'}</button></div></div>`;
      });
      if (cards) { any = true; h += `<h2>${tn} · ${gn} · ${rs.length} ชิ้น</h2><div class="grid">${cards}</div>`; }
    }));
    box.innerHTML = h + (any ? '' : '<div class="empty">ไม่มีค่าที่วัดในช่วงวันที่ที่เลือก – ลองกด "ทั้งหมด"</div>');

    this.plotNG(s, vis);
    this.TYPES.forEach(([ty]) => this.GROUPS.forEach(([g]) => this.METRICS.forEach(([k]) => this.plot(s, ty, g, k, skipped))));
    if (skipped.length) box.insertAdjacentHTML('afterbegin',
      `<div class="warn">ข้ามค่าที่น่าจะพิมพ์ผิดในกราฟ: ${skipped.join('; ')} – ดู/แก้ได้ที่หน้า "ตารางข้อมูล"</div>`);
  },

  /* ---------- วาดกราฟ 1 ใบ ---------- */
  plot(s, ty, g, k, skipped) {
    const key = this.key(ty, g), cv = document.getElementById(`c_${key}_${k}`); if (!cv) return;
    const vis = this.shownDays(s);
    const clean = s.rows.filter(r => {
      if (r.g !== g || this.rty(r) !== ty || !this.num(r[k]) || !vis.includes(r.d)) return false;
      if (this.isOutlier(s, r, k)) { skipped.push(`${r.d} ชิ้นที่ ${r.p} ${this.SHORT[k]}=${r[k]}`); return false; }
      return true;
    });
    const pts = clean.filter(r => !this.off.has(r.d));
    const [la, lb] = this.getLim(s, key, k);
    const a = (la !== '' && this.num(+la)) ? +la : null, b = (lb !== '' && this.num(+lb)) ? +lb : null;
    const ngc = this.css('--ng') || '#dc2626', lim = this.css('--lim') || '#d97706';
    const mu = this.css('--mu'), gr = this.css('--grid');
    const colOf = d => this.COLORS[Math.max(0, vis.indexOf(d)) % this.COLORS.length];
    const bad = r => (this.outOf(r[k], a, b) ? 'oos' : (this.isNG(r) ? 'ng' : ''));

    /* ชิปวัน + บรรทัดสรุป */
    const cdays = [...new Set(clean.map(r => r.d))].sort((x, y) => this.dkey(x) - this.dkey(y));
    document.getElementById(`s_${key}_${k}`).innerHTML = cdays.map(d => {
      const rr = clean.filter(r => r.d === d), v = rr.map(r => r[k]);
      const mean = v.reduce((x, y) => x + y, 0) / v.length;
      const out = v.filter(x => this.outOf(x, a, b)).length, nNG = rr.filter(r => this.isNG(r)).length;
      return `<button class="daych ${this.off.has(d) ? 'off' : ''}" data-day="${d}" title="${rr[0].by || ''} ${rr[0].line || ''}">`
        + `<i style="background:${colOf(d)}"></i>${d}<span class="n">n ${v.length} · x̄ ${this.fmt(mean)}</span>`
        + (out ? `<span class="o">นอกสเปก ${out}</span>` : '') + (nNG ? `<span class="o">NG ${nNG}</span>` : '') + '</button>';
    }).join('');

    const sumEl = document.getElementById(`m_${key}_${k}`), vals = pts.map(r => r[k]);
    if (sumEl) {
      if (!vals.length) sumEl.innerHTML = '<span>ซ่อนทุกวันอยู่ – กดชิปวันเพื่อแสดงกลับ</span>';
      else {
        const mean = vals.reduce((x, y) => x + y, 0) / vals.length;
        const out = vals.filter(v => this.outOf(v, a, b)).length, nNG = pts.filter(r => this.isNG(r)).length;
        const cp = this.cpk(vals, a, b);
        sumEl.innerHTML = `<span>จำนวน <b>${vals.length}</b> ชิ้น</span><span>เฉลี่ย <b>${this.fmt(mean)}</b></span>`
          + `<span>ต่ำสุด–สูงสุด <b>${this.fmt(Math.min(...vals))} – ${this.fmt(Math.max(...vals))}</b></span>`
          + `<span>นอกสเปก <span class="${out ? 'bad' : 'good'}">${a === null && b === null ? '–' : out}</span></span>`
          + `<span>NG <span class="${nNG ? 'bad' : 'good'}">${nNG}</span></span>`
          + (cp !== null ? `<span>Cpk <b class="${cp < 1.33 ? 'bad' : 'good'}">${cp.toFixed(2)}</b></span>` : '');
      }
    }

    /* แกนนอน */
    const ord = [...pts].sort((x, y) => this.dkey(x.d) - this.dkey(y.d) || (+x.p || 0) - (+y.p || 0));
    const seq = new Map(); ord.forEach((r, i) => seq.set(r, i + 1));
    const seqLabel = []; ord.forEach((r, i) => (seqLabel[i + 1] = r.p));
    const xOf = r => (this.xmode === 'pcs' ? (+r.p || 0) : seq.get(r));
    const xs = ord.map(xOf), xmin = xs.length ? Math.min(...xs) : 0, xmax = xs.length ? Math.max(...xs) : 1;

    /* กรอบแกน Y – ซูมเข้าหาช่วงสเปก ค่าที่ไกลมากจะถูกดันมาอยู่ที่ขอบกราฟ */
    let ylo, yhi;
    if (a !== null && b !== null && b > a) {
      const w = b - a;
      ylo = a - w * .45; yhi = b + w * .45;
      const near = vals.filter(v => v >= a - w * 3 && v <= b + w * 3);
      if (near.length) { ylo = Math.min(ylo, Math.min(...near)); yhi = Math.max(yhi, Math.max(...near)); }
      const p = (yhi - ylo) * .06; ylo -= p; yhi += p;
    } else {
      let lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1;
      if (a !== null) lo = Math.min(lo, a);
      if (b !== null) hi = Math.max(hi, b);
      const p = ((hi - lo) || Math.abs(hi) * .02 || 1) * .12; ylo = lo - p; yhi = hi + p;
    }
    const clamp = v => Math.min(yhi, Math.max(ylo, v));
    const nClip = vals.filter(v => v < ylo || v > yhi).length;
    if (nClip && sumEl && vals.length) sumEl.insertAdjacentHTML('beforeend', `<span class="bad">⚠ ${nClip} จุดอยู่นอกกรอบ (แสดงที่ขอบกราฟ)</span>`);

    /* แถบสเปก + เส้น LSL/USL (วาดไว้ด้านหลัง) */
    const ds = [];
    const lineOf = (lab, y) => ({ label: lab, data: [{ x: xmin, y }, { x: xmax, y }], borderColor: lim, borderWidth: 1.6, borderDash: [7, 4], pointRadius: 0, pointHitRadius: 0, order: 0, tension: 0 });
    if (a !== null && b !== null) {
      const u = lineOf('USL', b); u.fill = '+1'; u.backgroundColor = 'rgba(22,163,74,.10)';
      ds.push(u, lineOf('LSL', a));
    } else {
      if (b !== null) ds.push(lineOf('USL', b));
      if (a !== null) ds.push(lineOf('LSL', a));
    }

    /* หน้าตาของจุด (ค่าที่เกินกรอบถูก clamp มาไว้ที่ขอบ แต่ tooltip ยังโชว์ค่าจริง) */
    const styleOf = rr => ({
      data: rr.map(r => ({ x: xOf(r), y: clamp(r[k]), r })),
      pointRadius: rr.map(r => (bad(r) ? 7.5 : 3)),
      pointHoverRadius: rr.map(r => (bad(r) ? 9.5 : 6)),
      pointStyle: rr.map(r => (bad(r) === 'oos' ? 'rectRot' : bad(r) === 'ng' ? 'triangle' : 'circle'))
    });

    const bands = [];
    if (this.xmode === 'seq') {
      /* เรียงตามเวลา = เส้นเดียว สีเดียว (อ่านง่ายกว่าเส้นซ้อนกันหลายวัน) */
      const col = this.css('--ac') || '#2563eb';
      ds.push({
        label: 'ค่าที่วัด', order: 1, tension: .12, borderWidth: 1.6, borderColor: col + '99', backgroundColor: col,
        ...styleOf(ord),
        pointBackgroundColor: ord.map(r => (bad(r) ? ngc : col)),
        pointBorderColor: ord.map(r => (bad(r) ? ngc : col)),
        pointBorderWidth: ord.map(r => (bad(r) ? 2 : 1))
      });
      [...new Set(ord.map(r => r.d))].forEach(d => {
        const dx = ord.filter(r => r.d === d).map(xOf);
        bands.push({ d, x0: Math.min(...dx) - .5, x1: Math.max(...dx) + .5 });
      });
    } else {
      /* ซ้อนตามชิ้นที่ = เส้นแยกตามวัน */
      [...new Set(ord.map(r => r.d))].forEach(d => {
        const col = colOf(d), rr = ord.filter(r => r.d === d);
        ds.push({
          label: d, order: 1, tension: .15, borderWidth: 1.5, borderColor: col + '99', backgroundColor: col,
          ...styleOf(rr),
          pointBackgroundColor: rr.map(r => (bad(r) ? ngc : col)),
          pointBorderColor: rr.map(r => (bad(r) ? ngc : col)),
          pointBorderWidth: rr.map(r => (bad(r) ? 2 : 1))
        });
      });
    }

    /* แถบคั่นวัน + วันที่กำกับ (เฉพาะโหมดเรียงตามเวลา) */
    const dayBand = {
      id: 'dayband',
      beforeDatasetsDraw(ch) {
        if (!bands.length || !ch.chartArea) return;
        const ca = ch.chartArea, sx = ch.scales.x, c = ch.ctx;
        c.save();
        bands.forEach((bd, i) => {
          const L = Math.max(ca.left, sx.getPixelForValue(bd.x0)), R = Math.min(ca.right, sx.getPixelForValue(bd.x1));
          if (R <= L) return;
          if (i % 2) { c.fillStyle = 'rgba(148,163,184,.09)'; c.fillRect(L, ca.top, R - L, ca.bottom - ca.top); }
          if (i) { c.strokeStyle = 'rgba(148,163,184,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(L, ca.top); c.lineTo(L, ca.bottom); c.stroke(); }
          if (R - L > 40) {
            c.fillStyle = mu || '#94a3b8';
            c.font = '10px system-ui,"Segoe UI",sans-serif';
            c.textAlign = 'center';
            c.fillText(String(bd.d).slice(0, 5), (L + R) / 2, ca.top + 12);
          }
        });
        c.restore();
      }
    };

    this.list.push(new Chart(cv, {
      type: 'line',
      data: { datasets: ds },
      plugins: [dayBand],
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        layout: { padding: { top: this.xmode === 'seq' ? 10 : 2 } },
        interaction: { mode: 'nearest', intersect: true },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: it => { const r = it[0] && it[0].raw && it[0].raw.r; return r ? `${r.d} · ชิ้นที่ ${r.p}` : (it[0] ? it[0].dataset.label : ''); },
              label: ctx => {
                const r = ctx.raw && ctx.raw.r;
                if (!r) return `${ctx.dataset.label} = ${ctx.parsed.y}`;
                const o = [`${this.SHORT[k]} = ${r[k]}`];
                if (this.outOf(r[k], a, b)) o.push('⚠ หลุดสเปก');
                if (r[k] < ylo || r[k] > yhi) o.push('(ค่าจริงอยู่นอกกรอบกราฟ)');
                if (r.ok === 'NG') o.push('Appearance NG');
                if (r.res === 'NG') o.push('Result NG');
                if (r.by) o.push('ผู้บันทึก: ' + r.by);
                if (r.line) o.push('Line: ' + r.line);
                if (r.rm) o.push('Remark: ' + r.rm);
                return o;
              }
            }
          }
        },
        scales: {
          x: {
            type: 'linear',
            min: this.xmode === 'pcs' ? 1 : undefined,
            title: { display: true, color: mu, font: { size: 11 }, text: this.xmode === 'pcs' ? 'ชิ้นที่ (pcs) – ทุกวันซ้อนกัน' : 'เรียงตามเวลา (ซ้าย = เก่า) · ตัวเลข = ชิ้นที่' },
            ticks: { color: mu, autoSkip: true, maxTicksLimit: 16, precision: 0, callback: v => (this.xmode === 'pcs' ? v : (seqLabel[v] ?? '')) },
            grid: { color: gr }
          },
          y: { ticks: { color: mu }, grid: { color: gr }, min: ylo, max: yhi }
        }
      }
    }));
  }
};
