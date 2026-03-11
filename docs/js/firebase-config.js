// =====================================================
// FIREBASE YAPILANDIRMASI
// Firebase Console > Proje Ayarları > Uygulamalar
// buradan kopyalayıp yapıştır
// =====================================================
const firebaseConfig = {
  apiKey: "AIzaSyCbbSkP0MvAYqhpBGSBZWzz597fTGqZHTU",
  authDomain: "sata-muhendislik.firebaseapp.com",
  projectId: "sata-muhendislik",
  storageBucket: "sata-muhendislik.firebasestorage.app",
  messagingSenderId: "716541850632",
  appId: "1:716541850632:web:9ee3fd7df74e6ff4b64dbd"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
