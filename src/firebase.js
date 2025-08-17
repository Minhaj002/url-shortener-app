import { initializeApp } from "firebase/app";
  import { getFirestore, collection } from "firebase/firestore";

  const firebaseConfig = {
    apiKey: "AIzaSyCqU3KZiOav2KaKiRBuzjj7hN8uP2TAE7o",
    authDomain: "react-url-shortener-72ae7.firebaseapp.com",
    projectId: "react-url-shortener-72ae7",
    storageBucket: "react-url-shortener-72ae7.firebasestorage.app",
    messagingSenderId: "1063595490558",
    appId: "1:1063595490558:web:47b32a419c696a89f479af"
  };

  const app = initializeApp(firebaseConfig);
  export const db = getFirestore(app);
  export const urlsCollection = collection(db, "urls");