/* JDK Enterprises Firebase Messaging service worker. */
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDiF6XftmC16ioika5gX7dkE-V2EEdkhyU",
  authDomain: "jdk-ent.firebaseapp.com",
  databaseURL: "https://jdk-ent-default-rtdb.firebaseio.com",
  projectId: "jdk-ent",
  storageBucket: "jdk-ent.firebasestorage.app",
  messagingSenderId: "844091044120",
  appId: "1:844091044120:web:b99b8e7ea459eb18f42e6d"
});

firebase.messaging();
