import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { doc, setDoc, getDocs, getDoc, collection } from 'firebase/firestore';

export default class SoundsRoute extends Route {
  @service router;
  @service auth;
  @service firebase;

  async model() {
    //ensure user is logged in
    try {
      await this.auth.ensureInitialized();
      await this.auth.ensureLoggedIn();
    } catch (error) {
      console.log(error);
      this.router.transitionTo('splash');
    }
    const ref = collection(this.firebase.db, 'users', this.auth.user.email, 'soundbytes');
    const docSnap = await getDocs(ref);
    const data = docSnap.docs.map((d) => {
      return {
        ...d.data(),
        id: d.id,
      }
    });
    console.log(data);
    return data;
  }
}
