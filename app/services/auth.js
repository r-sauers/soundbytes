import Service from '@ember/service';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { doc, setDoc } from 'firebase/firestore';

import {
  signInWithPopup,
  GoogleAuthProvider,
  getAuth,
  signOut,
  onAuthStateChanged,
  authStateReady,
} from 'firebase/auth';

import { tracked } from '@glimmer/tracking';

export default class AuthService extends Service {
  @service firebase;
  @service router;

  auth = getAuth(this.firebase.app);

  @tracked user = undefined;
  @tracked loggedIn = Boolean(this.user);

  // await the result of this function to wait for the user data to be loaded.
  // Otherwise you can run into issues accessing the data before it's loaded

  async ensureInitialized() {
    await this.auth.authStateReady();
    this.user = this.auth.currentUser;
  }

  async requireLogout() {
    await this.ensureInitialized();
    if (this.user) {
      this.router.transitionTo('sounds');
    }
  }
  async requireLogin() {
    await this.ensureInitialized();
    if (!this.user) {
      this.router.transitionTo('splash');
    }
  }

  async ensureLoggedIn() {
    await this.ensureInitialized();
    if (!this.user) {
      throw new Error('NOT LOGGED IN');
    }
  }

  async init() {
    super.init(...arguments);
    await this.ensureInitialized();
    onAuthStateChanged(this.auth, (user) => {
      this.user = user;
      this.loggedIn = Boolean(user);
    });
  }

  async handleNewSignIn() {
    let docRef = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'userData',
      'soundbyteMetaData',
    );
    await setDoc(docRef, {
      nextID: 0,
      categories: [],
    });
  }

  @action
  async sign_in_with_popup() {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await signInWithPopup(this.auth, provider);
    this.handleNewSignIn();
    return result;
  }

  @action
  async sign_out() {
    signOut(this.auth);
    this.router.transitionTo('splash');
  }
}
