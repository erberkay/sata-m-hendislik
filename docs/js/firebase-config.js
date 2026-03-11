// =====================================================
// FIREBASE YAPILANDIRMASI
// Firebase Console > Proje Ayarları > Uygulamalar
// buradan kopyalayıp yapıştır
// =====================================================
const firebaseConfig = {
  apiKey: "BURAYA_API_KEY",
  authDomain: "PROJE_ID.firebaseapp.com",
  projectId: "PROJE_ID",
  storageBucket: "PROJE_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();
