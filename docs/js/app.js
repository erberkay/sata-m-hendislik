// NAVBAR
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
}
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id === '#') return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks.classList.remove('open');
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

// DOSYA SEÇİMİ
let selectedFiles = [];
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileDrop = document.getElementById('fileDrop');

if (fileDrop) {
  fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('drag-over'); });
  fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('drag-over'));
  fileDrop.addEventListener('drop', e => { e.preventDefault(); fileDrop.classList.remove('drag-over'); addFiles([...e.dataTransfer.files]); });
}
if (fileInput) {
  fileInput.addEventListener('change', () => { addFiles([...fileInput.files]); fileInput.value = ''; });
}

function addFiles(newFiles) {
  newFiles.forEach(f => { if (!selectedFiles.find(x => x.name === f.name && x.size === f.size)) selectedFiles.push(f); });
  renderFilePreview();
}
function removeFile(idx) { selectedFiles.splice(idx, 1); renderFilePreview(); }
function renderFilePreview() {
  if (!filePreview) return;
  filePreview.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-chip">
      <span>${f.name.match(/\.(jpg|jpeg|png|gif)$/i) ? '🖼️' : '📄'}</span>
      <span>${f.name} (${(f.size / 1024).toFixed(0)}KB)</span>
      <span class="remove" onclick="removeFile(${i})">×</span>
    </div>`).join('');
}

// STORAGE'A DOSYA YÜKLE
async function dosyalariYukle(projeId) {
  if (!selectedFiles.length) return [];
  const urls = [];
  const uploadProgress = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  if (uploadProgress) uploadProgress.style.display = 'block';

  for (let i = 0; i < selectedFiles.length; i++) {
    const file = selectedFiles[i];
    const ref = storage.ref(`projeler/${projeId}/${Date.now()}_${file.name}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    urls.push(url);
    const pct = Math.round(((i + 1) / selectedFiles.length) * 100);
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressText) progressText.textContent = `Yükleniyor... ${pct}%`;
  }
  if (uploadProgress) uploadProgress.style.display = 'none';
  return urls;
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
      const docRef = await db.collection('projeler').add({
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
        dosyalar: [],
        olusturma: firebase.firestore.FieldValue.serverTimestamp()
      });

      const dosyaUrls = await dosyalariYukle(docRef.id);
      if (dosyaUrls.length) await docRef.update({ dosyalar: dosyaUrls });

      teklifForm.style.display = 'none';
      formSuccess.style.display = 'block';
      formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      console.error(err);
      showToast('error', 'Hata', 'Gönderim başarısız. Firebase yapılandırmasını kontrol edin.');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>📨 Teklif Talebini Gönder</span>';
    }
  });
}

function resetForm() {
  if (teklifForm) { teklifForm.reset(); teklifForm.style.display = 'block'; }
  if (formSuccess) formSuccess.style.display = 'none';
  if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<span>📨 Teklif Talebini Gönder</span>'; }
  selectedFiles = [];
  renderFilePreview();
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
