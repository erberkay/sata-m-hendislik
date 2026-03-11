require('dotenv').config();
const express = require('express');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Veritabanı ---
const db = new DatabaseSync(path.join(__dirname, 'sata.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS projeler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baslik TEXT NOT NULL,
    kategori TEXT NOT NULL,
    aciklama TEXT,
    genislik REAL,
    yukseklik REAL,
    uzunluk REAL,
    adet INTEGER,
    butce TEXT,
    dosyalar TEXT DEFAULT '[]',
    musteri_ad TEXT NOT NULL,
    musteri_email TEXT NOT NULL,
    musteri_telefon TEXT,
    musteri_sehir TEXT,
    durum TEXT DEFAULT 'yeni',
    notlar TEXT,
    olusturma DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS teklifler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proje_id INTEGER NOT NULL,
    fiyat REAL NOT NULL,
    para_birimi TEXT DEFAULT 'TRY',
    teslim_gun INTEGER,
    notlar TEXT,
    dosya TEXT,
    olusturma DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (proje_id) REFERENCES projeler(id)
  );
`);

// --- Upload Ayarları ---
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, unique + path.extname(file.originalname));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|pdf|dwg|dxf/i;
    if (allowed.test(path.extname(file.originalname))) cb(null, true);
    else cb(new Error('Desteklenmeyen dosya türü'));
  }
});

const teklif_upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
});

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'gizli-anahtar',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// --- Auth Middleware ---
function adminAuth(req, res, next) {
  if (req.session.admin) return next();
  res.status(401).json({ hata: 'Yetkisiz erişim' });
}

// ========================
// PUBLIC ROUTES
// ========================

// Proje talebi gönder
app.post('/api/teklif', upload.array('dosyalar', 10), (req, res) => {
  try {
    const {
      baslik, kategori, aciklama, genislik, yukseklik, uzunluk,
      adet, butce, musteri_ad, musteri_email, musteri_telefon, musteri_sehir
    } = req.body;

    if (!baslik || !kategori || !musteri_ad || !musteri_email) {
      return res.status(400).json({ hata: 'Zorunlu alanları doldurun' });
    }

    const dosyalar = req.files ? req.files.map(f => '/uploads/' + f.filename) : [];

    const stmt = db.prepare(`
      INSERT INTO projeler (baslik, kategori, aciklama, genislik, yukseklik, uzunluk,
        adet, butce, dosyalar, musteri_ad, musteri_email, musteri_telefon, musteri_sehir)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      baslik, kategori, aciklama || '',
      parseFloat(genislik) || null, parseFloat(yukseklik) || null, parseFloat(uzunluk) || null,
      parseInt(adet) || 1, butce || '',
      JSON.stringify(dosyalar),
      musteri_ad, musteri_email, musteri_telefon || '', musteri_sehir || ''
    );

    res.json({ basari: true, id: result.lastInsertRowid, mesaj: 'Talebiniz alındı. En kısa sürede size dönüş yapacağız.' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// ========================
// ADMIN ROUTES
// ========================

// Login
app.post('/api/admin/giris', (req, res) => {
  const { sifre } = req.body;
  if (sifre === process.env.ADMIN_PASSWORD) {
    req.session.admin = true;
    res.json({ basari: true });
  } else {
    res.status(401).json({ hata: 'Hatalı şifre' });
  }
});

// Logout
app.post('/api/admin/cikis', (req, res) => {
  req.session.destroy();
  res.json({ basari: true });
});

// Oturum kontrol
app.get('/api/admin/durum', (req, res) => {
  res.json({ girisli: !!req.session.admin });
});

// Tüm projeleri listele
app.get('/api/admin/projeler', adminAuth, (req, res) => {
  const { durum } = req.query;
  let query = 'SELECT * FROM projeler';
  const params = [];
  if (durum) {
    query += ' WHERE durum = ?';
    params.push(durum);
  }
  query += ' ORDER BY olusturma DESC';
  const projeler = db.prepare(query).all(...params);
  projeler.forEach(p => { p.dosyalar = JSON.parse(p.dosyalar || '[]'); });
  res.json(projeler);
});

// Proje detayı
app.get('/api/admin/projeler/:id', adminAuth, (req, res) => {
  const proje = db.prepare('SELECT * FROM projeler WHERE id = ?').get(req.params.id);
  if (!proje) return res.status(404).json({ hata: 'Proje bulunamadı' });
  proje.dosyalar = JSON.parse(proje.dosyalar || '[]');
  const teklifler = db.prepare('SELECT * FROM teklifler WHERE proje_id = ? ORDER BY olusturma DESC').all(proje.id);
  res.json({ proje, teklifler });
});

// Durum güncelle
app.patch('/api/admin/projeler/:id/durum', adminAuth, (req, res) => {
  const { durum, notlar } = req.body;
  const gecerli = ['yeni', 'inceleniyor', 'teklif_verildi', 'kabul_edildi', 'reddedildi', 'tamamlandi'];
  if (!gecerli.includes(durum)) return res.status(400).json({ hata: 'Geçersiz durum' });
  db.prepare('UPDATE projeler SET durum = ?, notlar = COALESCE(?, notlar) WHERE id = ?')
    .run(durum, notlar || null, req.params.id);
  res.json({ basari: true });
});

// Teklif gönder
app.post('/api/admin/projeler/:id/teklif', adminAuth, teklif_upload.single('dosya'), (req, res) => {
  try {
    const { fiyat, para_birimi, teslim_gun, notlar } = req.body;
    const proje_id = req.params.id;

    const proje = db.prepare('SELECT id FROM projeler WHERE id = ?').get(proje_id);
    if (!proje) return res.status(404).json({ hata: 'Proje bulunamadı' });

    const dosya = req.file ? '/uploads/' + req.file.filename : null;

    db.prepare(`
      INSERT INTO teklifler (proje_id, fiyat, para_birimi, teslim_gun, notlar, dosya)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(proje_id, parseFloat(fiyat), para_birimi || 'TRY', parseInt(teslim_gun) || null, notlar || '', dosya);

    db.prepare("UPDATE projeler SET durum = 'teklif_verildi' WHERE id = ?").run(proje_id);

    res.json({ basari: true, mesaj: 'Teklif kaydedildi' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ hata: 'Sunucu hatası' });
  }
});

// İstatistikler
app.get('/api/admin/istatistik', adminAuth, (req, res) => {
  const toplam = db.prepare('SELECT COUNT(*) as sayi FROM projeler').get();
  const yeni = db.prepare("SELECT COUNT(*) as sayi FROM projeler WHERE durum = 'yeni'").get();
  const teklif = db.prepare("SELECT COUNT(*) as sayi FROM projeler WHERE durum = 'teklif_verildi'").get();
  const tamamlandi = db.prepare("SELECT COUNT(*) as sayi FROM projeler WHERE durum = 'tamamlandi'").get();
  res.json({
    toplam: toplam.sayi,
    yeni: yeni.sayi,
    teklif_verildi: teklif.sayi,
    tamamlandi: tamamlandi.sayi
  });
});

// Admin HTML
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, () => {
  console.log(`\n✅ Sata Mühendislik sunucusu çalışıyor: http://localhost:${PORT}`);
  console.log(`🔐 Admin paneli: http://localhost:${PORT}/admin`);
  console.log(`🔑 Admin şifresi: ${process.env.ADMIN_PASSWORD}\n`);
});
