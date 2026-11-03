/* เก็บ/โหลดข้อมูล (localStorage) + Export / Import Excel */
const Store = {
  KEY: 'electrode_v2',
  CFG: { url: 'https://cyluvzqkssxofkrjxmzi.supabase.co', key: 'sb_publishable_cjTsS0r2NpjC2nL4jcBU-g_CDjtkJEj', bucket: 'ng-photos' },   // ← ใส่ Project URL และ anon public key จาก Supabase (Project Settings → API)
  V: 'electrode_v2_ver', D: 'electrode_v2_dirty',
  ok() { return !!(this.CFG.url && this.CFG.key); },
  uid: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
  rk: r => r.id || [r.d, r.by, r.p, r.g, r.ty, r.w, r.l, r.t].join('|'),
  say(t) { if (this.onStatus) this.onStatus(t); },
  hd(x) { return Object.assign({ apikey: this.CFG.key, Authorization: 'Bearer ' + this.CFG.key }, x || {}); },
  photoUrl(p) { return `${this.CFG.url}/storage/v1/object/public/${this.CFG.bucket}/${p}`; },
  ids(st) { st.sheets.forEach((s, i) => s.rows.forEach((r, j) => { if (!r.id) r.id = 'L' + i + '_' + j; })); return st; },   // แถวเดิมได้ id คงที่ ทุกเครื่องตรงกัน

  load() {
    try { const s = localStorage.getItem(this.KEY); if (s) return this.ids(JSON.parse(s)); } catch (e) {}
    return this.ids(JSON.parse(JSON.stringify(SEED)));
  },
  local(st) {
    try { localStorage.setItem(this.KEY, JSON.stringify(st, (k, v) => (k === 'imgs' ? undefined : v))); return true; }
    catch (e) { alert('บันทึกไม่ได้ (พื้นที่เบราว์เซอร์เต็ม) ลองใช้รูปที่เล็กลง หรือ Export Excel เก็บไว้'); return false; }
  },
  save(st) {   // เก็บในเครื่องทันที แล้วส่งขึ้น Supabase หลังหยุดพิมพ์ ~1.5 วินาที
    this.cur = st; const ok = this.local(st);
    localStorage.setItem(this.D, '1'); clearTimeout(this.tm); this.tm = setTimeout(() => this.push(), 1500);
    return ok;
  },
  reset() { localStorage.removeItem(this.KEY); localStorage.removeItem(this.V); localStorage.removeItem(this.D); },

  // ข้อมูลที่แชร์: ไม่รวม draft (ร่างที่ยังไม่บันทึก) และรูปที่ยังไม่อัปโหลด
  pack(st) { return { del: st.del || [], sheets: st.sheets.map(s => { const { draft, imgs, ...x } = s; return { ...x, rows: s.rows.map(({ phd, ...r }) => r) }; }) }; },
  merge(rem, st) {   // รวมแถวตาม id (แถวในเครื่องชนะถ้า id ซ้ำ) – แถวที่ลบในเครื่องขณะอีกเครื่องยังมีอยู่ อาจกลับมา
    const loc = new Map(st.sheets.map(s => [s.name, s]));
    st.del = [...new Set([...(rem.del || []), ...(st.del || [])])].slice(-1000); const dead = new Set(st.del);   // แถวที่ลบแล้วไม่ให้กลับมา
    st.sheets = rem.sheets.map(rs => {
      const ls = loc.get(rs.name); if (!ls) return rs;
      const m = new Map(rs.rows.filter(r => !dead.has(r.id)).map(r => [this.rk(r), r])); ls.rows.forEach(r => m.set(this.rk(r), r));
      const rows = [...m.values()], remIds = new Set(rs.rows.map(r => r.id)), used = new Map();   // วัน+up/low → เลขที่ใช้แล้ว
      const uk = r => r.d + '|' + r.g;
      rows.forEach(r => { if (remIds.has(r.id) && r.p != null) (used.get(uk(r)) || used.set(uk(r), new Set()).get(uk(r))).add(+r.p); });
      rows.forEach(r => {   // แถวจากเครื่องนี้ที่เลข pcs ชนกับของอีกเครื่อง → ขยับไปเลขถัดไป
        if (remIds.has(r.id) || r.p == null) return;
        const u = used.get(uk(r)) || used.set(uk(r), new Set()).get(uk(r));
        if (u.has(+r.p)) r.p = Math.max(0, ...u) + 1;
        u.add(+r.p);
      });
      return Object.assign(ls, { rows, lim: Object.assign({}, rs.lim, ls.lim) });
    });
  },
  async pull(st) {
    this.cur = st;
    if (!this.ok()) { this.say('ยังไม่ได้ตั้งค่า Supabase'); return null; }
    try {
      this.say('กำลังซิงก์…');
      const r = await fetch(`${this.CFG.url}/rest/v1/electrode_state?id=eq.1&select=data,updated_at`, { headers: this.hd() });
      if (!r.ok) throw 0;
      const [row] = await r.json();
      if (!row) { this.say('ไม่พบตาราง electrode_state'); return null; }
      if (!row.data || !row.data.sheets) { localStorage.setItem(this.V, row.updated_at); await this.push(); return null; }   // ครั้งแรก: ส่งข้อมูลในเครื่องขึ้นไป
      if (localStorage.getItem(this.D)) { await this.push(); return null; }                                              // มีของที่ยังไม่ส่ง
      localStorage.setItem(this.V, row.updated_at); this.say('ซิงก์แล้ว ✓'); return row.data;
    } catch (e) { this.say('ออฟไลน์ – ใช้ข้อมูลในเครื่อง'); return null; }
  },
  async push() {
    const st = this.cur; if (!st || !this.ok()) return;
    if (this.busy) { this.again = true; return; }
    this.busy = true; this.say('กำลังซิงก์…');
    const C = this.CFG, T = `${C.url}/rest/v1/electrode_state?id=eq.1`;
    try {
      for (const sh of st.sheets) for (const r of sh.rows) {   // อัปโหลดรูป NG ที่ค้างอยู่
        if (!r.id) r.id = this.uid();
        if (!r.phd) continue;
        const u = await fetch(`${C.url}/storage/v1/object/${C.bucket}/${r.id}.jpg`, { method: 'POST', headers: this.hd({ 'Content-Type': 'image/jpeg', 'x-upsert': 'true' }), body: await (await fetch(r.phd)).blob() });
        if (!u.ok) throw 0;
        r.ph = r.id + '.jpg'; delete r.phd; this.local(st);
      }
      for (let n = 0; n < 2; n++) {
        const ver = localStorage.getItem(this.V), force = this.forceNext;
        if (ver || force) {
          const res = await fetch(T + (force ? '' : '&updated_at=eq.' + encodeURIComponent(ver)), { method: 'PATCH', headers: this.hd({ 'Content-Type': 'application/json', Prefer: 'return=representation' }), body: JSON.stringify({ data: this.pack(st) }) });
          if (!res.ok) throw 0;
          const rows = await res.json();
          if (rows.length) { localStorage.setItem(this.V, rows[0].updated_at); localStorage.removeItem(this.D); this.forceNext = false; this.say('ซิงก์แล้ว ✓'); return; }
          if (force) throw 0;
        }
        const g = await fetch(T + '&select=data,updated_at', { headers: this.hd() });   // เครื่องอื่นบันทึกไปก่อน → ดึงมารวมแล้วลองใหม่
        if (!g.ok) throw 0;
        const [rem] = await g.json(); if (!rem) throw 0;
        if (rem.data && rem.data.sheets) { this.merge(rem.data, st); this.local(st); if (this.onMerge) this.onMerge(); }
        localStorage.setItem(this.V, rem.updated_at);
      }
      throw 0;
    } catch (e) { this.say('ออฟไลน์ – เก็บในเครื่องแล้ว จะส่งให้เมื่อมีเน็ต'); }
    finally { this.busy = false; if (this.again) { this.again = false; this.push(); } }
  },

  exportXlsx(st) {
    const wb = XLSX.utils.book_new();
    st.sheets.forEach(s => {
      const a = Array.from({ length: 15 + s.rows.length }, () => []);
      const put = (r, c, v) => { a[r][c] = v; };
      put(0, 0, 'Electrode Change Check Sheet'); put(0, 10, 'อนุมัติ'); put(0, 11, 'ตรวจสอบ'); put(0, 12, 'ออกเอกสาร');
      put(3, 1, 'Line :'); put(3, 2, (s.rows.length && s.rows[s.rows.length - 1].line) || ''); put(3, 5, 'Model :'); put(3, 6, s.model);
      put(5, 0, 'Drawing upper'); put(5, 6, 'Drawing lower');
      ['Date', 'Record by', 'pcs', 'up/low'].forEach((h, i) => put(13, i, h));
      put(13, 4, 'Wire Cut'); put(13, 7, 'new'); put(13, 10, 'Appearance (OK,NG)'); put(13, 11, 'result'); put(13, 12, 'Remark'); put(13, 13, 'Line');
      ['Width', 'length', 'Thickness', 'Width', 'length', 'Thickness'].forEach((h, i) => put(14, 4 + i, h));
      put(14, 17, 'Upper'); put(14, 18, 'Lower');
      let pd = null, pb = null;
      s.rows.forEach((r, i) => {
        const row = 15 + i;
        if (r.d !== pd) put(row, 0, r.d); if (r.by !== pb) put(row, 1, r.by);
        pd = r.d; pb = r.by;
        put(row, 2, r.p); put(row, 3, r.g);
        const isNew = r.ty === 'new';   // New → คอลัมน์ H–J, Wire Cut/Regrinding → คอลัมน์ E–G
        ['w', 'l', 't'].forEach((k, j) => { if (r[k] != null && r[k] !== '') put(row, (isNew ? 7 : 4) + j, r[k]); });
        if (!isNew) ['nw', 'nl', 'nt'].forEach((k, j) => { if (r[k] != null && r[k] !== '') put(row, 7 + j, r[k]); });
        put(row, 10, r.ok); put(row, 11, r.res); put(row, 12, r.rm); put(row, 13, r.line);
        const L = s.lim && s.lim[isNew ? r.g + '_new' : r.g] && s.lim[isNew ? r.g + '_new' : r.g].l;
        if (L && L[0] !== '' && L[1] !== '') { put(row, 17, L[1]); put(row, 18, L[0]); }
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), s.name.replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31));
    });
    XLSX.writeFile(wb, 'Record_Data_Electrode.xlsx');
  },

  importXlsx(file, old) {
    return new Promise((ok, fail) => {
      const rd = new FileReader();
      rd.onerror = () => fail(new Error('อ่านไฟล์ไม่ได้'));
      rd.onload = ev => {
        try {
          const wb = XLSX.read(ev.target.result, { type: 'array' });
          const n = v => (v === null || v === undefined || v === '' ? null : v);
          const sheets = wb.SheetNames.map(name => {
            const a = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true });
            const rows = [], lim = {}; let d = null, b = null;
            for (let i = 15; i < a.length; i++) {
              const r = a[i] || []; if (r[2] == null) continue;
              if (r[0]) d = String(r[0]).trim().replace(/\/(\d{4})$/, (m, y) => '/' + (+y > 2400 ? +y - 543 : y)); if (r[1]) b = String(r[1]).trim();
              const g = String(r[3] || '').trim().toLowerCase().startsWith('up') ? 'up' : 'low';
              const onlyNew = [r[4], r[5], r[6]].every(v => n(v) === null) && [r[7], r[8], r[9]].some(v => n(v) !== null);
              rows.push({ d, by: b, p: r[2], g, ty: onlyNew ? 'new' : 'wc', w: n(onlyNew ? r[7] : r[4]), l: n(onlyNew ? r[8] : r[5]), t: n(onlyNew ? r[9] : r[6]),
                nw: onlyNew ? null : n(r[7]), nl: onlyNew ? null : n(r[8]), nt: onlyNew ? null : n(r[9]),
                ok: String(r[10] || '').trim().toUpperCase(), res: String(r[11] || '').trim().toUpperCase(), rm: n(r[12]), line: String(r[13] ?? '').trim() });
              if (typeof r[17] === 'number' && typeof r[18] === 'number') { const lk = onlyNew ? g + '_new' : g; (lim[lk] = lim[lk] || {}).l = [r[18], r[17], true]; }
            }
            const prev = old.sheets.find(s => s.name === name);
            const line = (a[3] && (a[3][2] || a[3][3])) || '', model = (a[3] && (a[3][6] || a[3][7])) || '';
            return { name, line: String(line), model: String(model), rows, lim, imgs: (SEED.sheets.find(x => x.name === name) || {}).imgs || {} };
          });
          ok({ sheets });
        } catch (e) { fail(e); }
      };
      rd.readAsArrayBuffer(file);
    });
  }
};
