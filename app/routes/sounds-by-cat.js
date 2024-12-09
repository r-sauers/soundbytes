import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { doc, query, where, orderBy, setDoc, getDocs, getDoc, collection } from 'firebase/firestore';
import { tracked } from '@glimmer/tracking';


export default class SoundsByCatRoute extends Route {
  @service auth;
  @service router;
  @service firebase;

    @tracked soundbytes = [];
  @tracked cat;

  async beforeModel(params) {
    try {
      await this.auth.ensureInitialized();
      await this.auth.ensureLoggedIn();
    } catch (error) {
      console.log(error);
      this.router.transitionTo('splash');
    }
    this.cat = params.cat;
  }

  async model(params) {
    console.log(params)
    this.cat = params.cat;
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
    console.log("-------");
    console.log(this.soudbytes);
    
    return this.soundbytes;
  }

  setupController(controller, model){
    super.setupController(controller, model);
    controller.set('cat', this.cat);
  }
}

