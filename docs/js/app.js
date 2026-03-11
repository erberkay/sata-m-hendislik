// NAVBAR
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('open');
  });
}
document.addEventListener('click', e => {
  if (navLinks?.classList.contains('open') && !navLinks.contains(e.target) && !hamburger?.contains(e.target)) {
    navLinks.classList.remove('open');
    hamburger.classList.remove('open');
  }
});
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks.classList.remove('open');
      hamburger?.classList.remove('open');
    }
  });
});

// TOAST
function showToast(type, title, msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
    <div class="toast-text">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 4500);
}

// FORM SUBMIT → FİRESTORE
const teklifForm = document.getElementById('teklifForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');

if (teklifForm) {
  teklifForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const g = name => teklifForm.querySelector(`[name="${name}"]`)?.value?.trim() || '';

    if (!g('proje_baslik')) { showToast('error', 'Hata', 'Proje başlığı zorunludur'); return; }
    if (!g('ad_soyad')) { showToast('error', 'Hata', 'Ad soyad zorunludur'); return; }
    if (!g('email')) { showToast('error', 'Hata', 'E-posta zorunludur'); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div><span>Gönderiliyor...</span>';

    try {
      await db.collection('projeler').add({
        baslik: g('proje_baslik'),
        kategori: g('kategori'),
        aciklama: g('aciklama'),
        genislik: parseFloat(g('genislik_m')) || null,
        yukseklik: parseFloat(g('yukseklik_m')) || null,
        uzunluk: parseFloat(g('uzunluk_m')) || null,
        adet: parseInt(g('adet')) || 1,
        butce: g('butce'),
        musteri_ad: g('ad_soyad'),
        musteri_email: g('email'),
        musteri_telefon: g('telefon'),
        musteri_sehir: g('sehir'),
        durum: 'yeni',
        olusturma: firebase.firestore.FieldValue.serverTimestamp()
      });

      teklifForm.style.display = 'none';
      formSuccess.style.display = 'block';
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      console.error(err);
      showToast('error', 'Hata', 'Gönderim başarısız. Lütfen tekrar deneyin.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>📨 Teklif Talebini Gönder</span>';
    }
  });
}

function resetForm() {
  if (teklifForm) { teklifForm.reset(); teklifForm.style.display = 'block'; }
  if (formSuccess) formSuccess.style.display = 'none';
  if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>📨 Teklif Talebini Gönder</span>'; }
}

// MÜŞTERİ SORGULA
const durumTr = { yeni:'🆕 Yeni — İnceleme Bekliyor', inceleniyor:'🔍 İnceleniyor', teklif_verildi:'💰 Teklif Verildi', kabul_edildi:'✅ Kabul Edildi', reddedildi:'❌ Reddedildi', tamamlandi:'🏁 Tamamlandı' };

async function sorgulaMusteri() {
  const email = document.getElementById('sorguEmail').value.trim();
  const sonuc = document.getElementById('sorguSonuc');
  if (!email) { sonuc.innerHTML = '<p style="color:var(--danger);font-size:0.9rem;">Lütfen e-posta adresinizi girin.</p>'; return; }

  sonuc.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Sorgulanıyor...</p>';
  try {
    const snap = await db.collection('projeler').where('musteri_email', '==', email).orderBy('olusturma', 'desc').get();
    if (snap.empty) {
      sonuc.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;">Bu e-posta ile kayıtlı talep bulunamadı.</p>';
      return;
    }
    const rows = snap.docs.map(d => {
      const p = d.data();
      const tarih = p.olusturma?.toDate ? p.olusturma.toDate().toLocaleDateString('tr-TR') : '—';
      return `<div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:1rem 1.25rem;margin-bottom:0.75rem;">
        <div style="font-weight:600;margin-bottom:0.35rem;">${p.baslik || '—'}</div>
        <div style="font-size:0.82rem;color:var(--text-muted);">📅 ${tarih} &nbsp;|&nbsp; ${durumTr[p.durum] || p.durum}</div>
      </div>`;
    }).join('');
    sonuc.innerHTML = `<div style="margin-bottom:0.75rem;font-size:0.85rem;color:var(--text-muted);">${snap.size} talep bulundu:</div>${rows}`;
  } catch (e) {
    sonuc.innerHTML = '<p style="color:var(--danger);font-size:0.9rem;">Sorgulama başarısız. Lütfen tekrar deneyin.</p>';
  }
}

// SCROLL ANİMASYONLAR
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; } });
}, { threshold: 0.1 });

document.querySelectorAll('.hizmet-kart, .step-kart').forEach(el => {
  el.style.opacity = '0'; el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
