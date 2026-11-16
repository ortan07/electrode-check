/* ตัวอย่างไฟล์ config — คัดลอกไฟล์นี้เป็น js/config.js แล้วใส่ค่าจริง
   (js/config.js ถูก .gitignore ไว้ จะไม่ขึ้น git)
   ค่าจริงบนเว็บที่ deploy แล้ว ถูกสร้างอัตโนมัติโดย .github/workflows/deploy.yml
   โดยอ่านค่าจาก Settings → Secrets and variables → Actions → Variables */
window.APP_CONFIG = {
  url: 'https://xxxxxxxxxxxx.supabase.co',   // Supabase → Project Settings → Data API → Project URL
  key: 'sb_publishable_xxxxxxxxxxxx',        // Project Settings → API Keys → Publishable key
  bucket: 'ng-photos'
};
