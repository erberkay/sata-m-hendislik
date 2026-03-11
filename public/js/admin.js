// ===== STATE =====
let currentFilter = '';
let projelerData = [];
let currentProjeId = null;

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
async function login() {
  const sifre = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  try {
    const res = await fetch('/api/admin/giris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sifre })
    });
    if (res.ok) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminApp').style.display = 'flex';
      loadDashboard();
    } else {
      errEl.style.display = 'block';
      document.getElementById('loginPassword').value = '';
    }
  } catch (e) {
    errEl.textContent = 'Sunucuya bağlanılamadı.';
    errEl.style.display = 'block';
  }
}

async function logout() {
  await fetch('/api/admin/cikis', { method: 'POST' });
  document.getElementById('adminApp').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('loginPassword').value = '';
}

// Oturum kontrolü
async function checkSession() {
  const res = await fetch('/api/admin/durum');
  const data = await res.json();
  if (data.girisli) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'flex';
    loadDashboard();
  }
}
checkSession();

// ===== NAVIGATION =====
function showPage(page, filter) {
  document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  document.getElementById(`page-${page}`).style.display = 'block';
  const navEl = document.getElementById(`nav-${page}`);
  if (navEl) navEl.classList.add('active');

  const titles = { dashboard: 'Dashboard', projeler: 'Talepler' };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  if (page === 'projeler') {
    currentFilter = filter || '';
    loadProjeler(currentFilter);
  } else if (page === 'dashboard') {
    loadDashboard();
  }
}

function refreshData() {
  const activePage = document.querySelector('[id^="page-"]:not([style*="none"])');
  if (activePage?.id === 'page-projeler') loadProjeler(currentFilter);
  else loadDashboard();
  toast('success', 'Veriler yenilendi');
}

// ===== DASHBOARD =====
async function loadDashboard() {
  try {
    const [istatRes, projelerRes] = await Promise.all([
      fetch('/api/admin/istatistik'),
      fetch('/api/admin/projeler')
    ]);
    const istat = await istatRes.json();
    const projeler = await projelerRes.json();

    document.getElementById('statToplam').textContent = istat.toplam;
    document.getElementById('statYeni').textContent = istat.yeni;
    document.getElementById('statTeklif').textContent = istat.teklif_verildi;
    document.getElementById('statTamamlandi').textContent = istat.tamamlandi;

    const badge = document.getElementById('yeniBadge');
    badge.textContent = istat.yeni;
    badge.style.display = istat.yeni > 0 ? 'block' : 'none';

    // Son 10 proje
    const son10 = projeler.slice(0, 10);
    document.getElementById('dashboardTableBody').innerHTML = renderTable(son10);
  } catch (e) {
    toast('error', 'Veriler yüklenemedi');
  }
}

// ===== PROJELER =====
async function loadProjeler(filter) {
  try {
    const url = filter ? `/api/admin/projeler?durum=${filter}` : '/api/admin/projeler';
    const res = await fetch(url);
    projelerData = await res.json();
    document.getElementById('projelerTableBody').innerHTML = renderTable(projelerData);
  } catch (e) {
    toast('error', 'Veriler yüklenemedi');
  }
}

function filterProjeler(filter) {
  currentFilter = filter;
  document.querySelectorAll('#filterBtns .filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  loadProjeler(filter);
}

// ===== TABLE RENDER =====
function renderTable(projeler) {
  if (!projeler.length) {
    return `<div class="empty-state"><div class="icon">📭</div><p>Henüz talep yok</p></div>`;
  }

  const durumLabel = {
    yeni: '<span class="badge yeni">🆕 Yeni</span>',
    inceleniyor: '<span class="badge inceleniyor">🔍 İnceleniyor</span>',
    teklif_verildi: '<span class="badge teklif_verildi">💰 Teklif Verildi</span>',
    kabul_edildi: '<span class="badge kabul_edildi">✅ Kabul Edildi</span>',
    reddedildi: '<span class="badge reddedildi">❌ Reddedildi</span>',
    tamamlandi: '<span class="badge tamamlandi">🏁 Tamamlandı</span>'
  };

  const kategoriLabel = {
    celik_konstruksiyon: '🏗️ Çelik Konstrüksiyon',
    merdiven_korkuluk: '🪜 Merdiven & Korkuluk',
    kaynak_imalat: '🔧 Kaynak & İmalat',
    diger: '📦 Diğer'
  };

  return `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Proje</th>
          <th>Müşteri</th>
          <th>Kategori</th>
          <th>Durum</th>
          <th>Tarih</th>
          <th>İşlem</th>
        </tr>
      </thead>
      <tbody>
        ${projeler.map(p => `
          <tr>
            <td style="color:var(--text-muted);font-size:0.8rem;">#${p.id}</td>
            <td>
              <div class="project-title">${escHtml(p.baslik)}</div>
              <div class="project-sub">${escHtml(p.musteri_sehir || '—')}</div>
            </td>
            <td>
              <div class="project-title">${escHtml(p.musteri_ad)}</div>
              <div class="project-sub">${escHtml(p.musteri_email)}</div>
            </td>
            <td style="font-size:0.82rem;">${kategoriLabel[p.kategori] || p.kategori}</td>
            <td>${durumLabel[p.durum] || p.durum}</td>
            <td style="color:var(--text-muted);font-size:0.8rem;">${formatDate(p.olusturma)}</td>
            <td>
              <button class="action-btn primary" onclick="openProje(${p.id})">Detay</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ===== PROJE DETAY =====
async function openProje(id) {
  currentProjeId = id;
  try {
    const res = await fetch(`/api/admin/projeler/${id}`);
    const { proje, teklifler } = await res.json();

    document.getElementById('modalTitle').textContent = `#${proje.id} — ${proje.baslik}`;

    const kategoriLabel = {
      celik_konstruksiyon: '🏗️ Çelik Konstrüksiyon',
      merdiven_korkuluk: '🪜 Merdiven & Korkuluk',
      kaynak_imalat: '🔧 Kaynak & İmalat',
      diger: '📦 Diğer'
    };

    const durumOptions = ['yeni','inceleniyor','teklif_verildi','kabul_edildi','reddedildi','tamamlandi'];
    const durumTr = { yeni:'Yeni', inceleniyor:'İnceleniyor', teklif_verildi:'Teklif Verildi', kabul_edildi:'Kabul Edildi', reddedildi:'Reddedildi', tamamlandi:'Tamamlandı' };

    const olcular = [
      proje.genislik ? `G: ${proje.genislik}m` : null,
      proje.yukseklik ? `Y: ${proje.yukseklik}m` : null,
      proje.uzunluk ? `U: ${proje.uzunluk}m` : null
    ].filter(Boolean).join(' × ') || '—';

    const dosyaLinks = (proje.dosyalar || []).map(d =>
      `<a href="${d}" target="_blank" class="dosya-link">📎 ${d.split('/').pop()}</a>`
    ).join('') || '<span style="color:var(--text-dim);font-size:0.85rem;">Dosya eklenmemiş</span>';

    document.getElementById('modalBody').innerHTML = `
      <!-- Müşteri + Proje Bilgi -->
      <div class="detail-grid">
        <div class="detail-item">
          <label>Müşteri</label>
          <p>${escHtml(proje.musteri_ad)}</p>
        </div>
        <div class="detail-item">
          <label>E-posta</label>
          <p><a href="mailto:${proje.musteri_email}" style="color:var(--accent);">${proje.musteri_email}</a></p>
        </div>
        <div class="detail-item">
          <label>Telefon</label>
          <p>${proje.musteri_telefon || '—'}</p>
        </div>
        <div class="detail-item">
          <label>Şehir</label>
          <p>${proje.musteri_sehir || '—'}</p>
        </div>
        <div class="detail-item">
          <label>Kategori</label>
          <p>${kategoriLabel[proje.kategori] || proje.kategori}</p>
        </div>
        <div class="detail-item">
          <label>Bütçe Beklentisi</label>
          <p>${proje.butce || '—'}</p>
        </div>
        <div class="detail-item">
          <label>Ölçüler</label>
          <p>${olcular}</p>
        </div>
        <div class="detail-item">
          <label>Adet</label>
          <p>${proje.adet || 1}</p>
        </div>
      </div>

      ${proje.aciklama ? `
        <div class="detail-divider"></div>
        <div class="detail-item">
          <label>Açıklama</label>
          <p style="color:var(--text-muted);line-height:1.7;">${escHtml(proje.aciklama)}</p>
        </div>
      ` : ''}

      <div class="detail-divider"></div>
      <div class="section-title-sm">📎 Dosyalar</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;">${dosyaLinks}</div>

      <!-- Durum Güncelle -->
      <div class="detail-divider"></div>
      <div class="section-title-sm">⚙️ Durum Güncelle</div>
      <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
        <select class="durum-select" id="durumSelect">
          ${durumOptions.map(d => `<option value="${d}" ${d === proje.durum ? 'selected' : ''}>${durumTr[d]}</option>`).join('')}
        </select>
        <button class="action-btn" onclick="durumGuncelle()">Kaydet</button>
      </div>

      ${proje.notlar ? `<p style="margin-top:0.75rem;font-size:0.85rem;color:var(--text-muted);">Not: ${escHtml(proje.notlar)}</p>` : ''}

      <!-- Teklif Geçmişi -->
      ${teklifler.length > 0 ? `
        <div class="detail-divider"></div>
        <div class="section-title-sm">📋 Önceki Teklifler</div>
        <div class="teklif-gecmis">
          ${teklifler.map(t => `
            <div class="teklif-item">
              <div class="fiyat">${Number(t.fiyat).toLocaleString('tr-TR')} ${t.para_birimi}</div>
              <div class="meta">
                ${t.teslim_gun ? `Teslim: ${t.teslim_gun} gün` : ''}
                — ${formatDate(t.olusturma)}
                ${t.dosya ? `— <a href="${t.dosya}" target="_blank" style="color:var(--accent);">Dosya</a>` : ''}
              </div>
              ${t.notlar ? `<div style="margin-top:0.5rem;font-size:0.82rem;color:var(--text-muted);">${escHtml(t.notlar)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- Yeni Teklif -->
      <div class="detail-divider"></div>
      <div class="section-title-sm">💰 Teklif Ver</div>
      <div class="teklif-form">
        <div class="teklif-grid">
          <div>
            <label>Fiyat <span style="color:var(--accent);">*</span></label>
            <input type="number" id="teklifFiyat" placeholder="0.00" step="0.01" min="0">
          </div>
          <div>
            <label>Para Birimi</label>
            <select id="teklifPara">
              <option value="TRY">₺ TRY</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
          </div>
          <div>
            <label>Teslim Süresi (gün)</label>
            <input type="number" id="teklifTeslim" placeholder="30" min="1">
          </div>
        </div>
        <div style="margin-bottom:1rem;">
          <label>Teklif Notu</label>
          <textarea id="teklifNot" placeholder="Müşteriye iletmek istediğiniz notlar, koşullar..."></textarea>
        </div>
        <div style="margin-bottom:1rem;">
          <label>Teklif Dosyası (PDF)</label>
          <input type="file" id="teklifDosya" accept=".pdf,.docx" style="background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:0.5rem;color:var(--text);width:100%;">
        </div>
        <button class="action-btn primary" onclick="teklifGonder(${proje.id})" id="teklifBtn">
          💰 Teklifi Kaydet
        </button>
      </div>
    `;

    document.getElementById('modalOverlay').classList.add('open');
  } catch (e) {
    toast('error', 'Detay yüklenemedi');
  }
}

async function durumGuncelle() {
  const durum = document.getElementById('durumSelect').value;
  try {
    const res = await fetch(`/api/admin/projeler/${currentProjeId}/durum`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durum })
    });
    if (res.ok) {
      toast('success', 'Durum güncellendi');
      loadDashboard();
      if (currentFilter !== undefined) loadProjeler(currentFilter);
    } else throw new Error();
  } catch { toast('error', 'Güncelleme başarısız'); }
}

async function teklifGonder(projeId) {
  const fiyat = document.getElementById('teklifFiyat').value;
  if (!fiyat || parseFloat(fiyat) <= 0) {
    toast('error', 'Geçerli bir fiyat girin');
    return;
  }

  const btn = document.getElementById('teklifBtn');
  btn.disabled = true;
  btn.textContent = 'Kaydediliyor...';

  const fd = new FormData();
  fd.append('fiyat', fiyat);
  fd.append('para_birimi', document.getElementById('teklifPara').value);
  fd.append('teslim_gun', document.getElementById('teklifTeslim').value);
  fd.append('notlar', document.getElementById('teklifNot').value);
  const dosya = document.getElementById('teklifDosya').files[0];
  if (dosya) fd.append('dosya', dosya);

  try {
    const res = await fetch(`/api/admin/projeler/${projeId}/teklif`, {
      method: 'POST',
      body: fd
    });
    const data = await res.json();
    if (res.ok && data.basari) {
      toast('success', 'Teklif kaydedildi!');
      closeModalDirect();
      loadDashboard();
    } else throw new Error(data.hata);
  } catch (e) {
    toast('error', 'Teklif gönderilemedi');
    btn.disabled = false;
    btn.textContent = '💰 Teklifi Kaydet';
  }
}

// ===== MODAL =====
function closeModal(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModalDirect();
}
function closeModalDirect() {
  document.getElementById('modalOverlay').classList.remove('open');
  currentProjeId = null;
}

// ===== HELPERS =====
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('tr-TR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

// ESC to close modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModalDirect();
});
