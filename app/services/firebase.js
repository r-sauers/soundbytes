// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDYQ5PLZzPeYCsb9CrUpy7aljZzilhG1Jo',
  authDomain: 'csci-5117-project-2.firebaseapp.com',
  projectId: 'csci-5117-project-2',
  storageBucket: 'csci-5117-project-2.firebasestorage.app',
  messagingSenderId: '1045625198733',
  appId: '1:1045625198733:web:9e984ef3e44e476a46aac4',
  measurementId: 'G-BYY5PREQY2',
  storageBucket: 'csci-5117-project-2.firebasestorage.app',
};

export default class FirebaseService extends Service {
  app = initializeApp(firebaseConfig);
  db = getFirestore(this.app);
  storage = getStorage(app);
}
