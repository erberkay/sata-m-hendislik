// ===== NAVBAR =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger) {
  hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
}

// Smooth scroll for nav links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      navLinks.classList.remove('open');
    }
  });
});

// ===== TOAST =====
function showToast(type, title, msg) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : '❌'}</span>
    <div class="toast-text">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== DOSYA UPLOAD =====
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileDrop = document.getElementById('fileDrop');
let selectedFiles = [];

if (fileDrop) {
  fileDrop.addEventListener('dragover', e => { e.preventDefault(); fileDrop.classList.add('drag-over'); });
  fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('drag-over'));
  fileDrop.addEventListener('drop', e => {
    e.preventDefault();
    fileDrop.classList.remove('drag-over');
    addFiles([...e.dataTransfer.files]);
  });
}

if (fileInput) {
  fileInput.addEventListener('change', () => {
    addFiles([...fileInput.files]);
    fileInput.value = '';
  });
}

function addFiles(newFiles) {
  newFiles.forEach(f => {
    if (!selectedFiles.find(x => x.name === f.name && x.size === f.size)) {
      selectedFiles.push(f);
    }
  });
  renderFilePreview();
}

function removeFile(idx) {
  selectedFiles.splice(idx, 1);
  renderFilePreview();
}

function renderFilePreview() {
  if (!filePreview) return;
  filePreview.innerHTML = selectedFiles.map((f, i) => `
    <div class="file-chip">
      <span>${getFileIcon(f.name)}</span>
      <span>${f.name} (${formatSize(f.size)})</span>
      <span class="remove" onclick="removeFile(${i})">×</span>
    </div>
  `).join('');
}

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif'].includes(ext)) return '🖼️';
  if (ext === 'pdf') return '📄';
  return '📁';
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1024 / 1024).toFixed(1) + 'MB';
}

// ===== FORM SUBMIT =====
const teklifForm = document.getElementById('teklifForm');
const submitBtn = document.getElementById('submitBtn');
const formSuccess = document.getElementById('formSuccess');

if (teklifForm) {
  teklifForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate
    const data = new FormData(teklifForm);
    if (!data.get('baslik')?.trim()) {
      showToast('error', 'Hata', 'Proje başlığı zorunludur');
      return;
    }
    if (!data.get('musteri_ad')?.trim()) {
      showToast('error', 'Hata', 'Ad soyad zorunludur');
      return;
    }
    if (!data.get('musteri_email')?.trim()) {
      showToast('error', 'Hata', 'E-posta zorunludur');
      return;
    }

    // Remove the empty file input from FormData, add selected files
    data.delete('dosyalar');
    selectedFiles.forEach(f => data.append('dosyalar', f));

    // Loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="spinner"></div><span>Gönderiliyor...</span>';

    try {
      const res = await fetch('/api/teklif', { method: 'POST', body: data });
      const json = await res.json();

      if (res.ok && json.basari) {
        teklifForm.style.display = 'none';
        formSuccess.style.display = 'block';
      } else {
        throw new Error(json.hata || 'Bilinmeyen hata');
      }
    } catch (err) {
      showToast('error', 'Gönderim Hatası', err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>📨 Teklif Talebini Gönder</span>';
    }
  });
}

function resetForm() {
  if (teklifForm) {
    teklifForm.reset();
    teklifForm.style.display = 'block';
    selectedFiles = [];
    renderFilePreview();
  }
  if (formSuccess) formSuccess.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>📨 Teklif Talebini Gönder</span>';
  }
}

// ===== SCROLL ANIMATIONS =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.hizmet-kart, .step-kart').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});
