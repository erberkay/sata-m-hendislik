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

function kategoriSec(kategori) {
  setTimeout(() => {
    const sel = document.querySelector('[name="kategori"]');
    if (sel) sel.value = kategori;
  }, 400);
}

function resetForm() {
  if (teklifForm) { teklifForm.reset(); teklifForm.style.display = 'block'; }
  if (formSuccess) formSuccess.style.display = 'none';
  if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>📨 Teklif Talebini Gönder</span>'; }
}

// İLETİŞİM BİLGİLERİ — Firestore'dan yükle
(async () => {
  try {
    const doc = await db.collection('ayarlar').doc('iletisim').get();
    if (!doc.exists) return;
    const d = doc.data();
    if (d.telefon) {
      const link = document.getElementById('info-telefon-link');
      if (link) { link.textContent = d.telefon; link.href = 'tel:' + d.telefon.replace(/\s/g, ''); }
      // WhatsApp floating button href'ini de güncelle
      const wa = document.getElementById('whatsapp-fab');
      if (wa) {
        const num = d.telefon.replace(/\D/g, '').replace(/^0/, '90');
        wa.href = 'https://wa.me/' + num + '?text=Merhaba%2C%20proje%20hakk%C4%B1nda%20bilgi%20almak%20istiyorum.';
      }
    }
    if (d.email) {
      const link = document.getElementById('info-email-link');
      if (link) { link.textContent = d.email; link.href = 'mailto:' + d.email; }
    }
    if (d.adres) {
      const el = document.getElementById('info-adres');
      if (el) el.textContent = d.adres;
    }
    if (d.saat) {
      const el = document.getElementById('info-saat');
      if (el) el.textContent = d.saat;
    }
  } catch (e) { /* sessiz hata — varsayılan değerler göster */ }
})();

// SCROLL ANİMASYONLAR
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; } });
}, { threshold: 0.1 });

document.querySelectorAll('.hizmet-kart, .step-kart').forEach(el => {
  el.style.opacity = '0'; el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
