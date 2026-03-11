// ===== STATE =====
let currentFilter = '';
let currentProjeId = null;
let allProjeler = [];
let unsubscribeDashboard = null;
let unsubscribeProjeler = null;

// ===== TOAST =====
function toast(type, msg) {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="t-icon">${type === 'success' ? '✅' : '❌'}</span><span class="t-text">${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

// ===== AUTH =====
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'flex';
    startRealtime();
  } else {
    if (unsubscribeDashboard) { unsubscribeDashboard(); unsubscribeDashboard = null; }
    if (unsubscribeProjeler) { unsubscribeProjeler(); unsubscribeProjeler = null; }
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminApp').style.display = 'none';
  }
});

async function loginWithEmail() {
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { errEl.style.display = 'block'; return; }
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch (e) {
    errEl.style.display = 'block';
  }
}

async function logout() {
  await auth.signOut();
}

// ===== NAVİGASYON =====
function showPage(page, filter) {
  document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).style.display = 'block';
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');
  const titles = { dashboard: 'Dashboard', projeler: 'Talepler', musteriler: 'Kayıtlı Müşteriler', iletisim: 'İletişim Bilgileri' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  if (page === 'projeler') {
    currentFilter = filter || '';
    loadProjeler(currentFilter);
    document.querySelectorAll('#filterBtns .filter-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = [...document.querySelectorAll('#filterBtns .filter-btn')].find(b => {
      const onclick = b.getAttribute('onclick') || '';
      return onclick.includes(`'${currentFilter}'`) || (currentFilter === '' && onclick.includes("''"));
    });
    if (activeBtn) activeBtn.classList.add('active');
  } else if (page === 'musteriler') {
    loadMusteriler();
  } else if (page === 'iletisim') {
    loadIletisim();
  } else {
    loadDashboard();
  }
}

function refreshData() {
  startRealtime();
  toast('success', 'Veriler yenilendi');
}

// ===== REAL-TIME =====
function startRealtime() {
  if (unsubscribeDashboard) unsubscribeDashboard();
  unsubscribeDashboard = db.collection('projeler').orderBy('olusturma', 'desc')
    .onSnapshot(snap => {
      allProjeler = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      updateDashboardUI();
      // Projeler sayfası açıksa orayı da güncelle
      const projPage = document.getElementById('page-projeler');
      if (projPage && projPage.style.display !== 'none') {
        const filtered = currentFilter ? allProjeler.filter(p => p.durum === currentFilter) : allProjeler;
        document.getElementById('projelerTableBody').innerHTML = renderTable(filtered);
      }
    }, e => { console.error(e); toast('error', 'Bağlantı hatası'); });
}

let dashCurrentFilter = '';

function updateDashboardUI() {
  const toplam = allProjeler.length;
  const yeni = allProjeler.filter(p => p.durum === 'yeni').length;
  const teklif = allProjeler.filter(p => p.durum === 'teklif_verildi').length;
  const tamam = allProjeler.filter(p => p.durum === 'tamamlandi').length;

  document.getElementById('statToplam').textContent = toplam;
  document.getElementById('statYeni').textContent = yeni;
  document.getElementById('statTeklif').textContent = teklif;
  document.getElementById('statTamamlandi').textContent = tamam;

  const badge = document.getElementById('yeniBadge');
  badge.textContent = yeni;
  badge.style.display = yeni > 0 ? 'inline-block' : 'none';

  const filtered = dashCurrentFilter ? allProjeler.filter(p => p.durum === dashCurrentFilter) : allProjeler;
  document.getElementById('dashboardTableBody').innerHTML = renderTable(filtered);
}

function dashFilter(event, filter) {
  dashCurrentFilter = filter;
  document.querySelectorAll('#dashFilterBtns .filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  updateDashboardUI();
}

function loadDashboard() { updateDashboardUI(); }

// ===== MÜŞTERİLER =====
async function loadMusteriler() {
  const body = document.getElementById('musterilerBody');
  body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">Yükleniyor...</div>';
  try {
    const snap = await db.collection('musteriler').orderBy('olusturma', 'desc').get();
    if (snap.empty) {
      body.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>Henüz kayıtlı müşteri yok</p></div>';
      return;
    }
    body.innerHTML = `
      <table>
        <thead><tr><th>#</th><th>Ad Soyad</th><th>E-posta</th><th>Telefon</th><th>Kayıt Tarihi</th></tr></thead>
        <tbody>
          ${snap.docs.map((d, i) => {
            const m = d.data();
            return `<tr>
              <td style="color:var(--text-muted);font-size:0.8rem;">${i + 1}</td>
              <td><div class="project-title">${esc(m.ad || '—')}</div></td>
              <td><div class="project-sub"><a href="mailto:${m.email}" style="color:var(--accent);">${esc(m.email)}</a></div></td>
              <td><div class="project-title"><a href="tel:${m.telefon}" style="color:var(--success);">${esc(m.telefon || '—')}</a></div></td>
              <td style="color:var(--text-muted);font-size:0.8rem;">${formatDate(m.olusturma)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  } catch (e) {
    console.error(e);
    body.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--danger);">Yüklenemedi.</div>';
  }
}

// ===== İLETİŞİM AYARLARI =====
async function loadIletisim() {
  try {
    const doc = await db.collection('ayarlar').doc('iletisim').get();
    if (doc.exists) {
      const d = doc.data();
      document.getElementById('ib-telefon').value = d.telefon || '';
      document.getElementById('ib-email').value = d.email || '';
      document.getElementById('ib-adres').value = d.adres || '';
      document.getElementById('ib-saat').value = d.saat || '';
    }
  } catch (e) { console.error(e); }
}

async function saveIletisim() {
  const btn = document.getElementById('iletisimSaveBtn');
  const msg = document.getElementById('iletisimMsg');
  btn.disabled = true; btn.textContent = 'Kaydediliyor...';
  msg.style.display = 'none';
  try {
    await db.collection('ayarlar').doc('iletisim').set({
      telefon: document.getElementById('ib-telefon').value.trim(),
      email: document.getElementById('ib-email').value.trim(),
      adres: document.getElementById('ib-adres').value.trim(),
      saat: document.getElementById('ib-saat').value.trim(),
      guncelleme: firebase.firestore.FieldValue.serverTimestamp()
    });
    msg.style.display = 'inline'; msg.style.color = 'var(--success)'; msg.textContent = '✅ Kaydedildi';
    toast('success', 'İletişim bilgileri güncellendi');
  } catch (e) {
    console.error(e);
    msg.style.display = 'inline'; msg.style.color = 'var(--danger)'; msg.textContent = '❌ Kaydedilemedi';
  } finally {
    btn.disabled = false; btn.innerHTML = '💾 Kaydet';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
  }
}

// ===== PROJELER =====
function loadProjeler(filter) {
  const filtered = filter ? allProjeler.filter(p => p.durum === filter) : allProjeler;
  document.getElementById('projelerTableBody').innerHTML = renderTable(filtered);
}

function filterProjeler(event, filter) {
  currentFilter = filter;
  document.querySelectorAll('#filterBtns .filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  loadProjeler(filter);
}

// ===== TABLO =====
const durumBadge = {
  yeni: '<span class="badge yeni">🆕 Yeni</span>',
  inceleniyor: '<span class="badge inceleniyor">🔍 İnceleniyor</span>',
  teklif_verildi: '<span class="badge teklif_verildi">💰 Teklif Verildi</span>',
  kabul_edildi: '<span class="badge kabul_edildi">✅ Kabul Edildi</span>',
  reddedildi: '<span class="badge reddedildi">❌ Reddedildi</span>',
  tamamlandi: '<span class="badge tamamlandi">🏁 Tamamlandı</span>'
};
const kategoriLabel = {
  'Çelik Konstrüksiyon': '🏗️ Çelik Konstrüksiyon',
  'Merdiven & Korkuluk': '🪜 Merdiven & Korkuluk',
  'Kaynak & Özel İmalat': '🔧 Kaynak & İmalat',
  'Diğer': '📦 Diğer'
};

function renderTable(projeler) {
  if (!projeler.length) return `<div class="empty-state"><div class="icon">📭</div><p>Henüz talep yok</p></div>`;
  return `
    <table>
      <thead><tr><th>#</th><th>Proje</th><th>Müşteri</th><th>Kategori</th><th>Durum</th><th>Tarih</th><th>İşlem</th></tr></thead>
      <tbody>
        ${projeler.map((p, i) => `
          <tr>
            <td style="color:var(--text-muted);font-size:0.8rem;">${i + 1}</td>
            <td><div class="project-title">${esc(p.baslik)}</div><div class="project-sub">${esc(p.musteri_sehir || '—')}</div></td>
            <td><div class="project-title">${esc(p.musteri_ad)}</div><div class="project-sub">${esc(p.musteri_email)}</div></td>
            <td style="font-size:0.82rem;">${kategoriLabel[p.kategori] || p.kategori || '—'}</td>
            <td>${durumBadge[p.durum] || p.durum}</td>
            <td style="color:var(--text-muted);font-size:0.8rem;">${formatDate(p.olusturma)}</td>
            <td><button class="action-btn primary" onclick="openProje('${p.id}')">Detay</button></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

// ===== DETAY MODAL =====
async function openProje(id) {
  currentProjeId = id;
  const proje = allProjeler.find(p => p.id === id);
  if (!proje) return;

  document.getElementById('modalTitle').textContent = `${esc(proje.baslik)}`;

  const olcular = [
    proje.genislik ? `G: ${proje.genislik}m` : null,
    proje.yukseklik ? `Y: ${proje.yukseklik}m` : null,
    proje.uzunluk ? `U: ${proje.uzunluk}m` : null
  ].filter(Boolean).join(' × ') || '—';

  const dosyaLinks = (proje.dosyalar || []).map(url => {
    const name = decodeURIComponent(url.split('/').pop().split('?')[0]).split('_').slice(1).join('_') || 'dosya';
    return `<a href="${url}" target="_blank" class="dosya-link">📎 ${name}</a>`;
  }).join('') || '<span style="color:var(--text-dim);font-size:0.85rem;">Dosya eklenmemiş</span>';

  // Teklifleri çek
  const teklifSnap = await db.collection('projeler').doc(id).collection('teklifler').orderBy('olusturma', 'desc').get();
  const teklifler = teklifSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const durumOptions = ['yeni','inceleniyor','teklif_verildi','kabul_edildi','reddedildi','tamamlandi'];
  const durumTr = { yeni:'Yeni', inceleniyor:'İnceleniyor', teklif_verildi:'Teklif Verildi', kabul_edildi:'Kabul Edildi', reddedildi:'Reddedildi', tamamlandi:'Tamamlandı' };

  document.getElementById('modalBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Müşteri</label><p>${esc(proje.musteri_ad)}</p></div>
      <div class="detail-item"><label>E-posta</label><p><a href="mailto:${proje.musteri_email}" style="color:var(--accent);">${proje.musteri_email}</a></p></div>
      <div class="detail-item"><label>Telefon</label><p>${proje.musteri_telefon || '—'}</p></div>
      <div class="detail-item"><label>Şehir</label><p>${proje.musteri_sehir || '—'}</p></div>
      <div class="detail-item"><label>Kategori</label><p>${kategoriLabel[proje.kategori] || proje.kategori || '—'}</p></div>
      <div class="detail-item"><label>Bütçe</label><p>${proje.butce || '—'}</p></div>
      <div class="detail-item"><label>Ölçüler</label><p>${olcular}</p></div>
      <div class="detail-item"><label>Adet</label><p>${proje.adet || 1}</p></div>
    </div>
    ${proje.aciklama ? `<div class="detail-divider"></div><div class="detail-item"><label>Açıklama</label><p style="color:var(--text-muted);line-height:1.7;">${esc(proje.aciklama)}</p></div>` : ''}
    <div class="detail-divider"></div>
    <div class="section-title-sm">📎 Dosyalar</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;">${dosyaLinks}</div>
    <div class="detail-divider"></div>
    <div class="section-title-sm">⚙️ Durum Güncelle</div>
    <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
      <select class="durum-select" id="durumSelect">
        ${durumOptions.map(d => `<option value="${d}" ${d === proje.durum ? 'selected' : ''}>${durumTr[d]}</option>`).join('')}
      </select>
      <button class="action-btn" onclick="durumGuncelle()">Kaydet</button>
    </div>
    ${teklifler.length ? `
      <div class="detail-divider"></div>
      <div class="section-title-sm">📋 Önceki Teklifler</div>
      <div class="teklif-gecmis">
        ${teklifler.map(t => `
          <div class="teklif-item">
            <div class="fiyat">${Number(t.fiyat).toLocaleString('tr-TR')} ${t.para_birimi || 'TRY'}</div>
            <div class="meta">${t.teslim_gun ? `Teslim: ${t.teslim_gun} gün —` : ''} ${formatDate(t.olusturma)} ${t.dosya ? `— <a href="${t.dosya}" target="_blank" style="color:var(--accent);">Dosya</a>` : ''}</div>
            ${t.notlar ? `<div style="margin-top:0.5rem;font-size:0.82rem;color:var(--text-muted);">${esc(t.notlar)}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}
    <div class="detail-divider"></div>
    <div class="section-title-sm">💰 Teklif Ver</div>
    <div class="teklif-form">
      <div class="teklif-grid">
        <div><label>Fiyat <span style="color:var(--accent);">*</span></label><input type="number" id="teklifFiyat" placeholder="0.00" step="0.01" min="0"></div>
        <div><label>Para Birimi</label><select id="teklifPara"><option value="TRY">₺ TRY</option><option value="USD">$ USD</option><option value="EUR">€ EUR</option></select></div>
        <div><label>Teslim (gün)</label><input type="number" id="teklifTeslim" placeholder="30" min="1"></div>
      </div>
      <div style="margin-bottom:1rem;"><label>Not</label><textarea id="teklifNot" placeholder="Müşteriye iletmek istediğiniz notlar..."></textarea></div>
      <button class="action-btn primary" onclick="teklifGonder('${id}')" id="teklifBtn">💰 Teklifi Kaydet</button>
    </div>
  `;

  document.getElementById('modalOverlay').classList.add('open');
}

async function durumGuncelle() {
  const durum = document.getElementById('durumSelect').value;
  try {
    await db.collection('projeler').doc(currentProjeId).update({ durum });
    toast('success', 'Durum güncellendi');
    const proje = allProjeler.find(p => p.id === currentProjeId);
    if (proje) proje.durum = durum;
    loadDashboard();
  } catch { toast('error', 'Güncelleme başarısız'); }
}

async function teklifGonder(projeId) {
  const fiyat = document.getElementById('teklifFiyat').value;
  if (!fiyat || parseFloat(fiyat) <= 0) { toast('error', 'Geçerli bir fiyat girin'); return; }

  const btn = document.getElementById('teklifBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Kaydediliyor...';

  try {
    await db.collection('projeler').doc(projeId).collection('teklifler').add({
      fiyat: parseFloat(fiyat),
      para_birimi: document.getElementById('teklifPara').value,
      teslim_gun: parseInt(document.getElementById('teklifTeslim').value) || null,
      notlar: document.getElementById('teklifNot').value,
      olusturma: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection('projeler').doc(projeId).update({ durum: 'teklif_verildi' });
    toast('success', 'Teklif kaydedildi!');
    closeModalDirect();
    loadDashboard();
  } catch (e) {
    console.error(e);
    toast('error', 'Teklif gönderilemedi');
    btn.disabled = false;
    btn.innerHTML = '💰 Teklifi Kaydet';
  }
}

// ===== MODAL =====
function closeModal(e) { if (e.target === document.getElementById('modalOverlay')) closeModalDirect(); }
function closeModalDirect() { document.getElementById('modalOverlay').classList.remove('open'); currentProjeId = null; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModalDirect(); });

// ===== YARDIMCI =====
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
