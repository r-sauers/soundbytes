import Route from '@ember/routing/route';
import { service } from '@ember/service';
import {
  query,
  where,
  orderBy,
  getDocs,
  collection,
} from 'firebase/firestore';

export default class SoundsByCatRoute extends Route {
  @service auth;
  @service router;
  @service firebase;
  @service category;

  soundbytes = [];
  catData = null;

  async beforeModel(params) {
    try {
      await this.auth.ensureInitialized();
      await this.auth.ensureLoggedIn();
    } catch (error) {
      console.log(error);
      this.router.transitionTo('splash');
    }
  }

  async model(params) {
    this.soundbytes = [];
    this.catName = params.cat;

    try {
      this.catData = await this.category.getCategory(this.catName);
    } catch (err) {
      console.error(err);
      this.router.transitionTo('category-404', {
        queryParams: {
          name: this.catName,
        },
      });
    }

    const ref = collection(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'soundbytes',
    );
    const ref2 = query(
      ref,
      where('category', '==', params.cat),
      orderBy('created', 'desc'),
    );
    const querySnapshot = await getDocs(ref2);
    querySnapshot.forEach((doc) => {
      const dat = doc.data();
      dat['id'] = doc.id;
      this.soundbytes.push(dat);
    });

    return {
      soundbytes: this.soundbytes,
      category: this.catData,
    };
  }
}
