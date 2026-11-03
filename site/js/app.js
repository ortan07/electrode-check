/* หน้าจอหลัก: แท็บ, คีย์ข้อมูลทีละชิ้น, Update → กราฟ, รูปอ้างอิง (ล็อก) */
/* สไตล์ช่อง Remark / คอลัมน์ NO (เพิ่มใหม่) */
document.head.insertAdjacentHTML('beforeend', '<style>#view .sum{margin-left:auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}#view .st{min-width:92px;padding:6px 12px;border:1px solid var(--grid,#334155);border-radius:10px;text-align:center}#view .st .sl{font-size:11px;color:var(--mu,#94a3b8)}#view .st .sv{font-size:20px;font-weight:700;line-height:1.3}#view .st .ss{font-size:11px;color:var(--mu,#94a3b8)}#view .st.bad{border-color:#f87171}#view .st.bad .sv{color:#f87171}#view .st.good .sv{color:#4ade80}#vtbl td.no{color:var(--mu,#94a3b8);text-align:center;width:48px}#vtbl input.te,#vtbl select.te,#draft input.dr{box-sizing:border-box;background:transparent;color:inherit;font:inherit;border:1px solid transparent;border-radius:6px;padding:3px 5px}#vtbl input.te{width:100%;min-width:60px}#vtbl input.te[data-k=d]{min-width:95px}#vtbl input.te[data-k=by],#vtbl input.te[data-k=line]{min-width:80px}#vtbl input.te[data-k=rm],#draft input.dr{min-width:160px}#vtbl input.te[type=number]{min-width:70px}#vtbl .te:hover,#vtbl .te:focus,#draft input.dr{border-color:var(--grid,#334155)}#vtbl .te:focus,#draft input.dr:focus{outline:1px solid var(--ac,#60a5fa)}#vtbl .te.out{background:rgba(250,204,21,.25)}#vtbl .te.ngc{color:#f87171;font-weight:700}#vtbl select.te option,#draft select.dt option{color:#000}#draft select.dt{background:transparent;color:inherit;font:inherit;border:1px solid var(--grid,#334155);border-radius:6px;padding:4px}#draft input.de.oos,#tbl input.oos,#vtbl input.te.oos{background:rgba(239,68,68,.30)!important;color:#f87171!important;font-weight:700;border-color:#f87171!important}.specbox{margin:10px 0}.specbox summary{cursor:pointer;font-weight:600}.spect{border-collapse:collapse;margin-top:6px}.spect th,.spect td{padding:3px 6px;text-align:center}.spect input.sp{width:78px;box-sizing:border-box;background:transparent;color:inherit;font:inherit;border:1px solid var(--grid,#334155);border-radius:6px;padding:3px 5px}.spect input.sp:disabled{opacity:.55}</style>');
let st = Store.load(), cur = 0;
st.by = st.by || ''; st.date = st.date || ''; st.line = st.line || '';
let mode = 'entry', tvRows = [], bulkLine = '', tsel = new Set();
const noLine = x => /AS186|AS187/.test(x.name);   // ซีต AS186/AS187 ไม่มี Line
const lineOf = x => (x.lineOv || '').trim() || (x.name.match(/AS\d+/) || [x.name])[0];   // Line = เลข AS จากชื่อซีต (กรอกทับเองได้ถ้าต้องการ)
const tf = { scope: 'sheet', d: '', by: '', line: '', g: '', ty: '', ng: false, rev: true };
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const uid = () => Store.uid();
let phIdx = 0;
const photoSrc = r => r.phd || (r.ph ? Store.photoUrl(r.ph) : '');
const photoCell = r => r.phd ? `<img class="thumb" src="${r.phd}" data-zoom="${r.phd}" data-cap="รูป NG"> <button class="tg" tabindex="-1" data-act="phdel">ลบรูป</button>` : '<button class="tg" tabindex="-1" data-act="ph">📷 ถ่ายรูป</button>';
const thumb = r => { const u = photoSrc(r); return u ? `<img class="thumb" src="${u}" data-zoom="${u}" data-cap="รูป NG ${esc(r.d)} ชิ้นที่ ${r.p}" loading="lazy">` : ''; };
const shrink = f => new Promise((ok, no) => {   // ย่อรูปเหลือด้านยาวสุด 1280px (JPEG) ก่อนเก็บ
  const u = URL.createObjectURL(f), im = new Image();
  im.onload = () => { const k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .8)); };
  im.onerror = () => no(new Error('อ่านรูปไม่ได้')); im.src = u;
});
document.body.insertAdjacentHTML('beforeend', '<input type="file" id="phIn" accept="image/*" capture="environment" hidden>');
$('.acts').insertAdjacentHTML('afterbegin', '<span id="sync" class="hint" style="align-self:center;margin:0"></span>');
const iso = () => new Date().toLocaleDateString('en-CA');
const toDMY = d => d.split('-').reverse().join('/');
const save = () => Store.save(st);
const sheet = () => st.sheets[cur];
const TYPES = [['wc', 'Regrinding / Wire Cut'], ['new', 'New']];
const tyOpts = v => TYPES.map(([k, n]) => `<option value="${k}" ${(v === 'new' ? 'new' : 'wc') === k ? 'selected' : ''}>${n}</option>`).join('');
const tyShort = r => (r.ty === 'new' ? 'New' : 'Wire Cut');
const FIELDS = [['w', 'Width'], ['l', 'Length'], ['t', 'Thickness']];
const refImgs = s => ((SEED.sheets.find(x => x.name === s.name) || {}).imgs) || {};   // (บรรทัดนี้อ่านจาก data.js เท่านั้น)   // รูปอ้างอิงมาจากไฟล์โค้ดเท่านั้น แก้ในเว็บไม่ได้
const nk = s => FIELDS.filter(([k]) => s.fields[k]).map(f => f[0]);
let specOpen = false;
/* ---------- เช็คค่าหลุดขนาด (LSL/USL จาก Drawing) ---------- */
const oos = (s, r, k) => {
  const v = r[k]; if (!Charts.num(v)) return false;
  const [a, b] = Charts.getLim(s, Charts.key(Charts.rty(r), r.g), k), E = 1e-9;
  return (a !== '' && Charts.num(+a) && v < +a - E) || (b !== '' && Charts.num(+b) && v > +b + E);
};
const oosAny = (s, r) => nk(s).some(k => oos(s, r, k));
const applySpec = (s, r) => { if (!r.manual) r.rn = oosAny(s, r); };   // หลุดขนาด → Result = NG อัตโนมัติ (ถ้าผู้ใช้กดสลับเองแล้ว จะไม่ทับ)
function paintRow(tr, s, r) {
  tr.querySelectorAll('.de').forEach(el => el.classList.toggle('oos', oos(s, r, el.dataset.k)));
  const b = tr.querySelector('[data-act="rn"]'); if (b) { b.textContent = r.rn ? 'NG' : 'OK'; b.classList.toggle('ngon', !!r.rn); }
}

/* pcs นับแยกกันระหว่าง up และ low (สลับเป็น low แล้วเริ่มนับใหม่) – ห้ามซ้ำภายใน up หรือ low เดียวกัน ในวันเดียวกันของซีตเดียวกัน */
const maxP = (s, d, g) => s.rows.reduce((m, r) => (r.d === d && r.g === g && Charts.num(+r.p) && r.p !== null && +r.p > m ? +r.p : m), 0);
const dupOf = (s, r) => (r.p === null || r.p === '' || r.p === undefined ? null : s.rows.find(x => x !== r && x.d === r.d && x.g === r.g && x.p !== null && +x.p === +r.p) || null);
function ensure(s) {
  if (!s.fields) {
    const f = {}; FIELDS.forEach(([k]) => (f[k] = s.rows.some(r => Charts.num(r[k]))));
    if (!Object.values(f).some(Boolean)) FIELDS.forEach(([k]) => (f[k] = true));
    s.fields = f;
  }
  if (!Array.isArray(s.draft) || !s.draft.length) s.draft = [newPiece(s)];
}
function newPiece(s) { const l = s.draft && s.draft[s.draft.length - 1]; return { g: l ? l.g : 'up', ty: l ? l.ty : (s.lastTy || 'wc'), w: null, l: null, t: null, ng: false, rn: false, manual: false, rm: '' }; }

function drawTabs() {
  $('#tabs').innerHTML = st.sheets.map((s, i) => `<button class="${i === cur ? 'on' : ''}" data-i="${i}">${esc(s.name)}</button>`).join('');
}

/* ---------- ส่วนคีย์ข้อมูล ---------- */
function drawEntry() {
  const s = sheet(); ensure(s);
  if (!st.date) st.date = iso();
  const dmy = toDMY(st.date), keys = nk(s), cols = FIELDS.filter(([k]) => s.fields[k]);
  const lines = [...new Set(st.sheets.flatMap(x => x.rows.map(r => r.line)).filter(Boolean))], prev = s.rows.slice(-5);
  const pv = prev.length ? `<div class="prev"><div class="pt">ชิ้นก่อนหน้า (${prev.length} ชิ้นล่าสุดที่บันทึกแล้ว)</div><div class="tw"><table class="pvt"><thead><tr><th>วันที่</th><th>ชิ้นที่</th><th>Line</th><th>up/low</th><th>ประเภท</th>${cols.map(c => `<th>${c[1]}</th>`).join('')}<th>Appearance</th><th>Result</th></tr></thead><tbody>${prev.map(r => `<tr class="${Charts.isNG(r) ? 'ngrow' : ''}"><td>${esc(r.d)}</td><td>${r.p}</td><td>${esc(r.line || '-')}</td><td>${r.g}</td><td>${tyShort(r)}</td>${keys.map(k => `<td>${r[k] ?? ''}</td>`).join('')}<td>${r.ok || ''}</td><td>${r.res || ''}</td></tr>`).join('')}</tbody></table></div></div>` : '<div class="prev hint">ซีตนี้ยังไม่มีข้อมูลที่บันทึก</div>';
  const specBox = `<details id="specBox" class="specbox" ${specOpen ? 'open' : ''}><summary>📐 Spec จาก Drawing (LSL / USL) – ใช้เช็คค่าหลุดขนาด</summary><div class="tw"><table class="spect"><thead><tr><th>ประเภท</th><th>up/low</th>${cols.map(c => `<th colspan="2">${c[1]}<br>LSL / USL</th>`).join('')}</tr></thead><tbody>${[['wc', 'up'], ['wc', 'low'], ['new', 'up'], ['new', 'low']].map(([ty, g]) => `<tr><td>${ty === 'new' ? 'New' : 'Wire Cut'}</td><td>${g}</td>${keys.map(k => { const key = Charts.key(ty, g), [a, b, lk] = Charts.getLim(s, key, k), d = lk ? 'disabled' : ''; return `<td><input class="sp" type="number" step="any" data-sg="${key}" data-sk="${k}" data-sb="0" value="${a}" ${d}></td><td><input class="sp" type="number" step="any" data-sg="${key}" data-sk="${k}" data-sb="1" value="${b}" ${d}></td>`; }).join('')}</tr>`).join('')}</tbody></table></div><div class="hint">ดูค่า LSL/USL จากรูป Drawing ด้านบน แล้วกรอกไว้ครั้งเดียว · ค่าชุดนี้ใช้ร่วมกับกราฟด้านล่าง · ช่องที่ 🔒 ล็อกไว้ แก้ได้ที่ปุ่มล็อกใต้กราฟ</div></details>`;
  $('#entry').innerHTML = `
  <h3>คีย์ข้อมูล</h3>
  <div class="meta">
    <label>วันที่<input type="date" id="eDate" value="${st.date}"></label>
    <label>ผู้บันทึก<input id="eBy" value="${esc(st.by)}" placeholder="ชื่อผู้คีย์"></label>
    ${noLine(s) ? '' : `<label>Line (ไม่ต้องกรอกก็ได้)<input id="eLine" list="lineList" value="${esc(s.lineOv)}" placeholder="${esc(lineOf(s))}"></label>`}<datalist id="lineList">${lines.map(l => `<option value="${esc(l)}">`).join('')}</datalist>
    <div class="chips">ค่าที่วัด: ${FIELDS.map(([k, n]) => `<label class="ck"><input type="checkbox" data-f="${k}" ${s.fields[k] ? 'checked' : ''}> ${n}</label>`).join('')}</div>
  </div>
  ${pv}
  ${specBox}
  <div class="pt">กำลังคีย์ – ชิ้นถัดไป (ยังไม่บันทึก)</div>
  <div class="tw"><table id="draft"><thead><tr><th>ชิ้นที่</th><th>up/low</th><th>ประเภท</th>${FIELDS.filter(([k]) => s.fields[k]).map(f => `<th>${f[1]}</th>`).join('')}<th title="Appearance (ลักษณะภายนอก)">Appearance NG</th><th title="result (ผลรวม)">Result NG</th><th>Remark</th><th>รูป NG</th><th></th></tr></thead><tbody>
  ${s.draft.map((r, i) => `<tr data-i="${i}"><td class="pn" data-l="ชิ้นที่">${maxP(s, dmy, r.g) + s.draft.slice(0, i).filter(x => x.g === r.g).length + 1}</td>
    <td data-l="up/low"><button class="tg" tabindex="-1" data-act="g">${r.g}</button></td>
    <td data-l="ประเภท"><select class="dt" tabindex="-1">${tyOpts(r.ty)}</select></td>
    ${cols.map(([k, n]) => `<td data-l="${n}"><input class="de ${oos(s, r, k) ? 'oos' : ''}" data-k="${k}" type="number" step="any" inputmode="decimal" enterkeyhint="next" value="${esc(r[k])}"></td>`).join('')}
    <td data-l="Appearance"><button class="tg ${r.ng ? 'ngon' : ''}" tabindex="-1" data-act="ng">${r.ng ? 'NG' : 'OK'}</button></td>
    <td data-l="Result"><button class="tg ${r.rn ? 'ngon' : ''}" tabindex="-1" data-act="rn">${r.rn ? 'NG' : 'OK'}</button></td>
    <td class="rmc" data-l="Remark"><input class="dr" data-k="rm" type="text" placeholder="Remark" value="${esc(r.rm)}"></td>
    <td class="phc" data-l="รูป NG (ถ่ายตอน Appearance = NG)">${r.ng ? photoCell(r) : ''}</td>
    <td class="dlc"><button class="x" tabindex="-1" data-act="del">✕</button></td></tr>`).join('')}
  </tbody></table></div>
  <div class="lm"><button class="btn" id="btnAdd">＋ ชิ้นถัดไป</button>
    <button class="btn primary" id="btnUpdate">Update ▶ แสดงกราฟ</button><span id="msg"></span></div>
  <div class="hint">พิมพ์ค่าแล้วกด Enter เพื่อไปช่องถัดไป / ชิ้นถัดไปอัตโนมัติ · กดปุ่ม up/low และ OK/NG เพื่อสลับ · วัดครบแล้วกด Update</div>`;
}
function say(t) { const m = $('#msg'); if (m) m.textContent = t; }
function focusPiece(i, k) {
  const tr = document.querySelectorAll('#draft tbody tr')[i]; if (!tr) return;
  (tr.querySelector(`[data-k="${k}"]`) || tr.querySelector('.de')).focus();
}
function addPiece() { const s = sheet(); s.draft.push(newPiece(s)); save(); drawEntry(); focusPiece(s.draft.length - 1, nk(s)[0]); }

function commit() {
  const s = sheet(), keys = nk(s);
  if (!st.date) return say('เลือกวันที่ก่อน');
  if (!st.by.trim()) return say('ใส่ชื่อผู้บันทึกก่อน');
  const rows = s.draft.filter(r => keys.some(k => Charts.num(r[k])));
  if (!rows.length) return say('ยังไม่มีค่าที่กรอก');
  rows.forEach(r => { if (!r.manual && oosAny(s, r)) r.rn = true; });
  const manOK = rows.map((r, i) => (r.manual && !r.rn && oosAny(s, r) ? i + 1 : 0)).filter(Boolean);
  if (manOK.length && !confirm(`ชิ้นที่ ${manOK.join(', ')} มีค่าหลุดขนาด แต่ Result ถูกตั้งเป็น OK\n\nยืนยันบันทึกแบบนี้ไหม?`)) return;
  const bad = [];
  rows.forEach((r, i) => keys.forEach(k => {
    if (!Charts.num(r[k])) return;
    const v = s.rows.filter(x => x.g === r.g && Charts.rty(x) === (r.ty === 'new' ? 'new' : 'wc') && Charts.num(x[k])).map(x => x[k]);
    if (v.length >= 3) { const m = Charts.median(v); if (r[k] > m * 20 || r[k] < m / 20) bad.push(`ชิ้น ${i + 1} ${k.toUpperCase()} = ${r[k]}`); }
  }));
  if (bad.length && !confirm('ค่าเหล่านี้ต่างจากข้อมูลเดิมมาก อาจพิมพ์ผิด:\n' + bad.join('\n') + '\n\nบันทึกต่อไหม?')) return;
  const dmy = toDMY(st.date); const pc = {};
  rows.forEach(r => { const p = pc[r.g] = (pc[r.g] ?? maxP(s, dmy, r.g)) + 1; s.rows.push({ d: dmy, by: st.by.trim(), line: noLine(s) ? '' : lineOf(s), p, g: r.g, ty: r.ty === 'new' ? 'new' : 'wc', w: keys.includes('w') ? r.w : null, l: keys.includes('l') ? r.l : null, t: keys.includes('t') ? r.t : null,
    nw: null, nl: null, nt: null, ok: r.ng ? 'NG' : 'OK', res: r.rn ? 'NG' : 'OK', rm: (r.rm || '').trim() || null, id: uid(), ...(r.ng && r.phd ? { phd: r.phd } : {}) }); });
  s.lastTy = rows[rows.length - 1].ty === 'new' ? 'new' : 'wc'; s.draft = []; ensure(s); save();
  drawSum(); drawEntry(); drawSaved(); Charts.render(s, $('#charts')); say(`บันทึก ${rows.length} ชิ้นแล้ว ✓`);
  $('#charts').scrollIntoView({ behavior: 'smooth' });
}

/* ---------- ข้อมูลที่บันทึกแล้ว (แก้/ลบได้) ---------- */
function drawSaved() {
  const s = sheet(), inp = (k, r) => `<input data-k="${k}" type="${k === 'd' || k === 'by' || k === 'line' || k === 'rm' ? 'text' : 'number'}" step="any" value="${esc(r[k])}">`;
  $('#savedSum').textContent = `ข้อมูลที่บันทึกแล้ว (${s.rows.length} ชิ้น) – ดู/แก้/ลบ`;
  $('#saved').innerHTML = `<table id="tbl"><thead><tr><th>Date</th><th>Record by</th><th>Line</th><th>pcs</th><th>up/low</th><th>ประเภท</th><th>Width</th><th>Length</th><th>Thickness</th><th>Appearance</th><th>Result</th><th>Remark</th><th>รูป</th><th></th></tr></thead><tbody>
  ${s.rows.map((r, i) => `<tr data-i="${i}"><td>${inp('d', r)}</td><td>${inp('by', r)}</td><td>${inp('line', r)}</td><td>${inp('p', r)}</td>
    <td><select data-k="g"><option ${r.g === 'up' ? 'selected' : ''}>up</option><option ${r.g === 'low' ? 'selected' : ''}>low</option></select></td>
    <td><select data-k="ty">${tyOpts(r.ty)}</select></td>
    <td>${inp('w', r)}</td><td>${inp('l', r)}</td><td>${inp('t', r)}</td>
    <td><select data-k="ok">${['', 'OK', 'NG'].map(o => `<option ${r.ok === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td>
    <td><select data-k="res">${['', 'OK', 'NG'].map(o => `<option ${r.res === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td>
    <td>${inp('rm', r)}</td><td>${thumb(r)}</td>
    <td><button class="x" data-del="${i}" title="ลบแถว">✕</button></td></tr>`).join('')}</tbody></table>`;
  flag();
}
function flag() {
  const s = sheet();
  document.querySelectorAll('#tbl tbody tr').forEach(tr => {
    const r = s.rows[+tr.dataset.i];
    ['w', 'l', 't'].forEach(k => { const el = tr.querySelector(`[data-k="${k}"]`); el.classList.toggle('out', Charts.isOutlier(s, r, k)); el.classList.toggle('oos', oos(s, r, k)); });
    tr.querySelector('[data-k="p"]').classList.toggle('dupc', !!dupOf(s, r));
    tr.querySelector('[data-k="ok"]').classList.toggle('ngc', r.ok === 'NG'); tr.querySelector('[data-k="res"]').classList.toggle('ngc', r.res === 'NG');
  });
}

/* ---------- สรุปภาพรวมของซีต (แทนช่องอนุมัติ/ตรวจสอบ/ออกเอกสาร) ---------- */
function drawSum() {
  const el = $('#sum'); if (!el) return;
  const s = sheet(), R = s.rows, c = f => R.filter(f).length, ng = c(r => Charts.isNG(r)), last = R[R.length - 1];
  const t = (label, val, sub = '', cls = '') => `<div class="st ${cls}"><div class="sl">${label}</div><div class="sv">${val}</div>${sub ? `<div class="ss">${sub}</div>` : ''}</div>`;
  el.innerHTML = t('ชิ้นทั้งหมด', R.length, 'ชิ้น')
    + t('Upper / Lower', `${c(r => r.g === 'up')} / ${c(r => r.g === 'low')}`, 'ชิ้น')
    + t('Wire Cut / New', `${c(r => Charts.rty(r) === 'wc')} / ${c(r => Charts.rty(r) === 'new')}`, 'ชิ้น')
    + t('OK', R.length - ng, R.length ? `${Math.round((R.length - ng) / R.length * 100)}% ของทั้งหมด` : 'ชิ้น', R.length - ng ? 'good' : '')
    + t('NG', ng, ng ? 'ตรวจสอบแถวสีแดง' : 'ไม่มี NG', ng ? 'bad' : 'good')
    + t('บันทึกล่าสุด', last ? esc(last.d) : '-', last ? esc([last.by, last.line].filter(Boolean).join(' · ')) : '');
}

/* ---------- หน้าซีต ---------- */
function drawSheet() {
  if (mode === 'table') { drawTable(); return; }
  const s = sheet(), im = refImgs(s);
  const card = (title, x) => `<div class="card"><h3>${title}${x ? ` · <span class="dn">${x.label}</span>` : ''}</h3><div class="dimg">${x ? `<img src="${x.src}" alt="${x.label}" data-zoom="${x.src}" data-cap="${x.label}">` : '<div class="noimg">ไม่มีรูปอ้างอิง</div>'}</div>${x ? '<div class="hint">คลิกที่รูปเพื่อขยาย (ซูม/ลากดูรายละเอียดได้)</div>' : ''}</div>`;
  $('#view').innerHTML = `
  <div class="head"><img class="logo" src="images/logo.png" alt="Siam Aisin"><div class="ttl"><h1>Electrode Change Check Sheet</h1><div class="sn">${esc(s.name)}</div></div>
    <div class="sum" id="sum"></div></div>
  <div class="draws ${im.both ? 'one' : ''}">${im.both ? card('Drawing (Upper / Lower)', im.both) : card('Drawing upper', im.upper) + card('Drawing lower', im.lower)}</div>
  <div class="card" id="entry"></div>
  <div id="charts"></div>
  <details class="card"><summary id="savedSum"></summary><div class="tw" id="saved"></div></details>`;
  drawSum(); drawEntry(); drawSaved(); Charts.render(s, $('#charts'));
}

/* ---------- หน้าดูตารางข้อมูล ---------- */
function drawModes() {
  $('#modes').innerHTML = `<button class="${mode === 'entry' ? 'on' : ''}" data-mode="entry">✏️ คีย์ข้อมูล / กราฟ</button><button class="${mode === 'table' ? 'on' : ''}" data-mode="table">📋 ตารางข้อมูล</button>`;
}
function viewRows() {
  const all = [];
  (tf.scope === 'all' ? st.sheets : [sheet()]).forEach(s => s.rows.forEach(r => all.push({ s, r })));
  const f = all.filter(({ r }) => (!tf.d || r.d === tf.d) && (!tf.by || r.by === tf.by) && (!tf.line || (r.line || '') === tf.line) && (!tf.g || r.g === tf.g) && (!tf.ty || Charts.rty(r) === tf.ty) && (!tf.ng || Charts.isNG(r)));
  const dk = d => { const m = String(d || '').match(/(\d+)\/(\d+)\/(\d+)/); return m ? +m[3] * 10000 + +m[2] * 100 + +m[1] : 0; };
  f.sort((a, b) => (tf.rev ? -1 : 1) * (dk(a.r.d) - dk(b.r.d)) || st.sheets.indexOf(a.s) - st.sheets.indexOf(b.s) || (a.r.g === 'up' ? 0 : 1) - (b.r.g === 'up' ? 0 : 1) || (+a.r.p || 0) - (+b.r.p || 0));   // วันที่ → ซีต → Upper ก่อน Lower → ชิ้นที่ (pcs) 1,2,3…
  return { all, f };
}
function drawTable() {
  const { all, f } = viewRows(); tvRows = f; const u = k => [...new Set(all.map(x => x.r[k]).filter(Boolean))];
  const sel = (t, label, vals) => `<label>${label}<select class="tf" data-t="${t}"><option value="">ทั้งหมด</option>${vals.map(v => `<option ${tf[t] === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>`;
  const tin = (k, r, c = '', dis = false) => `<input ${dis ? 'disabled' : ''} class="te ${c}" data-k="${k}" type="${['p', 'w', 'l', 't'].includes(k) ? 'number' : 'text'}" step="any" value="${esc(r[k])}">`;
  const selN = f.filter(x => tsel.has(x.r)).length, all_ = tf.scope === 'all', ngN = f.filter(x => Charts.isNG(x.r)).length, dupN = f.filter(x => dupOf(x.s, x.r)).length;
  $('#view').innerHTML = `
  <div class="head"><img class="logo" src="images/logo.png" alt="Siam Aisin"><div class="ttl"><h1>ตารางข้อมูลที่บันทึก</h1><div class="sn">${all_ ? 'ทุกซีต' : esc(sheet().name)}</div></div></div>
  <div class="card"><div class="meta">
    <label>ขอบเขต<select class="tf" data-t="scope"><option value="sheet" ${all_ ? '' : 'selected'}>ซีตนี้</option><option value="all" ${all_ ? 'selected' : ''}>ทุกซีต</option></select></label>
    ${sel('d', 'วันที่', u('d'))}${sel('by', 'ผู้บันทึก', u('by'))}${sel('line', 'Line', u('line'))}
    <label>up/low<select class="tf" data-t="g"><option value="">ทั้งหมด</option><option ${tf.g === 'up' ? 'selected' : ''}>up</option><option ${tf.g === 'low' ? 'selected' : ''}>low</option></select></label>
    <label>ประเภท<select class="tf" data-t="ty"><option value="">ทั้งหมด</option>${TYPES.map(([k, n]) => `<option value="${k}" ${tf.ty === k ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
    <label class="ck"><input type="checkbox" class="tf" data-t="ng" ${tf.ng ? 'checked' : ''}> เฉพาะ NG</label>
    <label class="ck"><input type="checkbox" class="tf" data-t="rev" ${tf.rev ? 'checked' : ''}> ล่าสุดก่อน</label>
    <button class="btn" id="btnTblXlsx">Export ตารางนี้ (Excel)</button>
    <button class="btn danger" id="btnTDel" ${selN ? '' : 'disabled'}>🗑 ลบที่เลือก (${selN})</button>
    <label>ใส่ Line ให้แถวที่ว่าง<input id="bulkLine" value="${esc(bulkLine)}" placeholder="เช่น Line 3"></label><button class="btn" id="btnBulkLine" title="ใส่ให้เฉพาะแถวที่ Line ว่าง · ซีต AS186/187 ข้ามให้อัตโนมัติ">ใส่ Line</button></div>
    <div class="hint">แสดง ${f.length} จาก ${all.length} แถว · NG ${ngN} แถว${dupN ? ` · <b style="color:var(--ng)">pcs ซ้ำ ${dupN} แถว (ช่องแดง)</b>` : ''} · ช่องสีเหลือง = ค่าที่น่าจะพิมพ์ผิด · แก้ไขข้อมูล/Remark ได้ในตารางนี้โดยตรง (บันทึกอัตโนมัติ) · ติ๊กช่องหน้าแถวเพื่อเลือกหลายแถวแล้วกด "ลบที่เลือก" หรือกด ✕ เพื่อลบทีละแถว</div>
    <div class="tw vt"><table id="vtbl"><thead><tr><th><input type="checkbox" id="tAll" title="เลือก/ยกเลิกทั้งหมดที่แสดง" ${f.length && selN === f.length ? 'checked' : ''}></th><th>NO</th>${all_ ? '<th>ซีต</th>' : ''}<th>Date</th><th>Record by</th><th>Line</th><th>pcs</th><th>up/low</th><th>ประเภท</th><th>Width</th><th>Length</th><th>Thickness</th><th>Appearance</th><th>Result</th><th>Remark</th><th>รูป</th><th></th></tr></thead><tbody>
    ${f.map(({ s, r }, n) => `<tr data-ti="${n}" class="${Charts.isNG(r) ? 'ngrow' : ''} ${tsel.has(r) ? 'selrow' : ''}"><td class="tk"><input type="checkbox" class="tsel" ${tsel.has(r) ? 'checked' : ''}></td><td class="no">${n + 1}</td>${all_ ? `<td>${esc(s.name)}</td>` : ''}
      <td>${tin('d', r)}</td><td>${tin('by', r)}</td><td>${tin('line', r, '', noLine(s))}</td><td>${tin('p', r, dupOf(s, r) ? 'dupc' : '')}</td>
      <td><select class="te" data-k="g"><option ${r.g === 'up' ? 'selected' : ''}>up</option><option ${r.g === 'low' ? 'selected' : ''}>low</option></select></td>
      <td><select class="te" data-k="ty">${tyOpts(r.ty)}</select></td>
      ${['w', 'l', 't'].map(k => `<td>${tin(k, r, (Charts.isOutlier(s, r, k) ? 'out ' : '') + (oos(s, r, k) ? 'oos' : ''))}</td>`).join('')}
      <td><select class="te ${r.ok === 'NG' ? 'ngc' : ''}" data-k="ok">${['', 'OK', 'NG'].map(o => `<option ${r.ok === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td>
      <td><select class="te ${r.res === 'NG' ? 'ngc' : ''}" data-k="res">${['', 'OK', 'NG'].map(o => `<option ${r.res === o ? 'selected' : ''}>${o}</option>`).join('')}</select></td>
      <td>${tin('rm', r)}</td><td>${thumb(r)}</td><td><button class="x" data-tdel="${n}" title="ลบแถว">✕</button></td></tr>`).join('') || '<tr><td colspan="17" class="empty">ไม่มีข้อมูลตามตัวกรอง</td></tr>'}
    </tbody></table></div></div>`;
}
function exportView() {
  const { f } = viewRows();
  const data = f.map(({ s, r }, n) => ({ NO: n + 1, Sheet: s.name, Date: r.d, 'Record by': r.by, Line: r.line || '', pcs: r.p, 'up/low': r.g, ประเภท: Charts.rty(r) === 'new' ? 'New' : 'Regrinding / Wire Cut', Width: r.w, length: r.l, Thickness: r.t, Appearance: r.ok, result: r.res, Remark: r.rm }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'ตารางข้อมูล');
  XLSX.writeFile(wb, 'Electrode_table_view.xlsx');
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target, s = sheet();
  if (t.closest('#tabs button[data-i]')) { cur = +t.closest('button').dataset.i; drawTabs(); drawSheet(); return; }
  if (!s) return;
  if (t.dataset.mode) { mode = t.dataset.mode; drawModes(); drawSheet(); return; }
  if (t.id === 'btnTblXlsx') { exportView(); return; }
  if (t.id === 'btnBulkLine') {
    const v = bulkLine.trim(); if (!v) { alert('พิมพ์ชื่อ Line ก่อน (เช่น Line 3)'); return; }
    const all = tf.scope === 'all', rows = (all ? st.sheets : [s]).filter(x => !noLine(x)).flatMap(x => x.rows.filter(r => !r.line));
    if (!rows.length) { alert(all ? 'ไม่มีแถวที่ Line ว่าง' : noLine(s) ? 'ซีตนี้ไม่ใช้ Line' : 'ทุกแถวในซีตนี้มี Line แล้ว'); return; }
    if (!confirm(`ใส่ "${v}" ให้ ${rows.length} แถวที่ Line ว่าง (${all ? 'ทุกซีต ยกเว้น AS186/187' : s.name}) ?`)) return;
    rows.forEach(r => (r.line = v)); st.line = v; save(); drawTable(); return;
  }
  if (t.id === 'btnTDel') {
    const pick = tvRows.filter(x => tsel.has(x.r)); if (!pick.length) return;
    if (!confirm(`ลบ ${pick.length} แถวที่เลือก${tf.scope === 'all' ? ' (จากทุกซีต)' : ''} ?\n(ลบแล้วกู้คืนไม่ได้ – ควร Export Excel เก็บไว้ก่อน)`)) return;
    st.del = st.del || [];
    pick.forEach(x => { const i = x.s.rows.indexOf(x.r); if (i >= 0) x.s.rows.splice(i, 1); if (x.r.id) st.del.push(x.r.id); tsel.delete(x.r); });
    st.del = st.del.slice(-1000); save(); drawTable(); return;
  }
  if (t.dataset.tdel !== undefined) {
    const x = tvRows[+t.dataset.tdel]; if (!x || !confirm(`ลบแถว ${x.r.d} ชิ้นที่ ${x.r.p} (${x.s.name}) ?`)) return;
    x.s.rows.splice(x.s.rows.indexOf(x.r), 1); tsel.delete(x.r); if (x.r.id) (st.del = st.del || []).push(x.r.id); save(); drawTable(); return;
  }
  if (t.dataset.zoom) { Viewer.open(t.dataset.zoom, t.dataset.cap); return; }
  if (t.id === 'btnAdd') addPiece();
  else if (t.id === 'btnUpdate') commit();
  else if (t.dataset.act) {
    const i = +t.closest('tr').dataset.i, r = s.draft[i];
    if (t.dataset.act === 'g') { r.g = r.g === 'up' ? 'low' : 'up'; applySpec(s, r); }
    else if (t.dataset.act === 'ng') r.ng = !r.ng;
    else if (t.dataset.act === 'ph') { phIdx = i; $('#phIn').click(); return; }
    else if (t.dataset.act === 'phdel') delete r.phd;
    else if (t.dataset.act === 'rn') { r.rn = !r.rn; r.manual = true; }
    else if (t.dataset.act === 'del') { s.draft.splice(i, 1); ensure(s); }
    save(); drawEntry();
  }
  else if (t.dataset.del !== undefined) { s.rows.splice(+t.dataset.del, 1); save(); drawSum(); drawSaved(); Charts.render(s, $('#charts')); drawEntry(); }
  else if (t.classList.contains('lockbtn')) {
    const g = t.dataset.g, k = t.dataset.k, [, , lock] = Charts.getLim(s, g, k);
    const ins = [...t.closest('.lm').querySelectorAll('input')].map(x => (x.value === '' ? '' : +x.value));
    if (!lock && (ins[0] === '' || ins[1] === '')) { alert('ใส่ทั้ง LSL และ USL ก่อนล็อก'); return; }
    s.lim = s.lim || {}; (s.lim[g] = s.lim[g] || {})[k] = [ins[0], ins[1], !lock];
    save(); Charts.render(s, $('#charts'));
  }
});

document.addEventListener('input', e => {
  const t = e.target, s = sheet(); if (!s) return;
  if (t.id === 'bulkLine') { bulkLine = t.value; return; }
  if (t.id === 'eBy') { st.by = t.value; save(); }
  else if (t.id === 'eLine') { s.lineOv = t.value; save(); }
  else if (t.classList.contains('dr')) { s.draft[+t.closest('tr').dataset.i].rm = t.value; save(); }
  else if (t.classList.contains('de')) { const r = s.draft[+t.closest('tr').dataset.i]; r[t.dataset.k] = t.value === '' ? null : +t.value; applySpec(s, r); paintRow(t.closest('tr'), s, r); save(); }
});

document.addEventListener('change', e => {
  const t = e.target, s = sheet(); if (!s) return;
  if (t.id === 'phIn') { const f = t.files[0], r = s.draft[phIdx]; t.value = ''; if (!f || !r) return; shrink(f).then(d => { r.phd = d; save(); drawEntry(); }).catch(err => alert(err.message)); return; }
  if (t.dataset.sg) {
    const g = t.dataset.sg, k = t.dataset.sk; s.lim = s.lim || {};
    const nv = [...((s.lim[g] = s.lim[g] || {})[k] || ['', '', false])]; nv[+t.dataset.sb] = t.value === '' ? '' : +t.value; nv[2] = false; s.lim[g][k] = nv;
    s.draft.forEach(r => applySpec(s, r)); save(); drawEntry(); drawSaved(); Charts.render(s, $('#charts')); return;
  }
  if (t.classList.contains('dt')) { const r = s.draft[+t.closest('tr').dataset.i]; r.ty = t.value; applySpec(s, r); save(); drawEntry(); return; }
  if (t.id === 'tAll') { tvRows.forEach(x => (t.checked ? tsel.add(x.r) : tsel.delete(x.r))); drawTable(); return; }
  if (t.classList.contains('tsel')) {
    const tr = t.closest('tr'), x = tvRows[+tr.dataset.ti]; if (!x) return;
    t.checked ? tsel.add(x.r) : tsel.delete(x.r); tr.classList.toggle('selrow', t.checked);
    const n = tvRows.filter(y => tsel.has(y.r)).length, b = $('#btnTDel'); b.disabled = !n; b.textContent = `🗑 ลบที่เลือก (${n})`; $('#tAll').checked = n === tvRows.length; return;
  }
  if (t.classList.contains('te')) {
    const tr = t.closest('tr'), x = tvRows[+tr.dataset.ti]; if (!x) return;
    const k = t.dataset.k, r = x.r, old = r[k];
    r[k] = ['p', 'w', 'l', 't'].includes(k) ? (t.value === '' ? null : +t.value) : (k === 'rm' ? (t.value.trim() || null) : t.value.trim());
    if ((k === 'p' || k === 'd') && dupOf(x.s, r)) { const o = dupOf(x.s, r); r[k] = old; alert(`ชิ้นที่ ${o.p} ของ ${o.g} วันที่ ${o.d} (${x.s.name}) มีอยู่แล้ว – เลขชิ้นซ้ำกันภายใน up หรือ low เดียวกันไม่ได้`); drawTable(); return; }
    save(); tr.classList.toggle('ngrow', Charts.isNG(r));
    ['w', 'l', 't'].forEach(c => { const el = tr.querySelector(`[data-k="${c}"]`); el.classList.toggle('out', Charts.isOutlier(x.s, r, c)); el.classList.toggle('oos', oos(x.s, r, c)); });
    ['ok', 'res'].forEach(c => tr.querySelector(`[data-k="${c}"]`).classList.toggle('ngc', r[c] === 'NG'));
    return;
  }
  if (t.classList.contains('tf')) { tf[t.dataset.t] = t.type === 'checkbox' ? t.checked : t.value; drawTable(); return; }
  if (t.id === 'eDate') { st.date = t.value; save(); drawEntry(); }
  else if (t.dataset.f) {
    s.fields[t.dataset.f] = t.checked;
    if (!nk(s).length) { s.fields[t.dataset.f] = true; }
    save(); drawEntry();
  }
  else if (t.closest('#tbl')) {
    const r = s.rows[+t.closest('tr').dataset.i], k = t.dataset.k;
    const old = r[k];
    r[k] = t.type === 'number' ? (t.value === '' ? null : +t.value) : t.value;
    if ((k === 'p' || k === 'd') && dupOf(s, r)) { const o = dupOf(s, r); r[k] = old; alert(`ชิ้นที่ ${o.p} ของ ${o.g} วันที่ ${o.d} มีอยู่แล้ว – เลขชิ้นซ้ำกันภายใน up หรือ low เดียวกันไม่ได้`); drawSaved(); return; }
    save(); flag(); drawSum(); Charts.render(s, $('#charts')); if (k === 'd') drawEntry();
  }
  else if (t.closest('#charts') && t.dataset.g && t.type === 'number') {
    const ins = [...t.closest('.lm').querySelectorAll('input')].map(x => (x.value === '' ? '' : +x.value));
    s.lim = s.lim || {}; (s.lim[t.dataset.g] = s.lim[t.dataset.g] || {})[t.dataset.k] = [ins[0], ins[1], false];
    save(); Charts.render(s, $('#charts'));
  }
});

document.addEventListener('toggle', e => { if (e.target.id === 'specBox') specOpen = e.target.open; }, true);

document.addEventListener('keydown', e => {
  const t = e.target; if (e.key !== 'Enter' || !t.classList || !(t.classList.contains('de') || t.classList.contains('dr'))) return;
  e.preventDefault();
  const s = sheet(), i = +t.closest('tr').dataset.i, keys = nk(s), j = t.classList.contains('dr') ? keys.length - 1 : keys.indexOf(t.dataset.k);
  if (j < keys.length - 1) focusPiece(i, keys[j + 1]);
  else if (i < s.draft.length - 1) focusPiece(i + 1, keys[0]);
  else addPiece();
});

$('#btnExport').onclick = () => Store.exportXlsx(st);
$('#btnImport').onclick = () => $('#fileImport').click();
$('#fileImport').onchange = async e => {
  const f = e.target.files[0]; if (!f) return; e.target.value = '';
  if (!confirm('นำเข้าไฟล์นี้จะแทนที่ข้อมูลปัจจุบันทั้งหมด ทำต่อไหม?')) return;
  try { const by = st.by, date = st.date, line = st.line; st = await Store.importXlsx(f, st); st.by = by; st.date = date; st.line = line; cur = 0; Store.forceNext = true; save(); drawTabs(); drawSheet(); }
  catch (err) { alert('นำเข้าไม่สำเร็จ: ' + err.message); }
};
$('#btnReset').onclick = () => {
  if (!confirm('คืนค่าเป็นข้อมูลตั้งต้นจากไฟล์ Excel เดิม? ข้อมูลที่คีย์เพิ่มจะหาย รวมถึงข้อมูลบนเซิร์ฟเวอร์ที่ทุกเครื่องใช้ร่วมกัน (ควร Export Excel เก็บไว้ก่อน)')) return;
  Store.reset(); st = Store.load(); st.by = ''; st.date = ''; st.line = ''; cur = 0; Store.forceNext = true; save(); drawTabs(); drawSheet();
};

drawTabs(); drawModes(); drawSheet();

/* ---------- ซิงก์กับ Supabase ---------- */
Store.onStatus = t => { const e = $('#sync'); if (e) e.textContent = t; };
Store.onMerge = () => { const f = document.activeElement; if (!f || !/INPUT|SELECT|TEXTAREA/.test(f.tagName)) { drawTabs(); drawSheet(); } };
window.addEventListener('online', () => Store.push());
Store.pull(st).then(d => {
  if (!d) return;
  const old = new Map(st.sheets.map(s => [s.name, s]));
  d.sheets.forEach(s => { const o = old.get(s.name); if (o) s.draft = o.draft; });   // ร่างที่ยังไม่บันทึกเป็นของแต่ละเครื่อง
  st.sheets = d.sheets; Store.ids(st); Store.local(st); if (cur >= st.sheets.length) cur = 0; Store.onMerge();
});
