import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { onSnapshot} from 'firebase/firestore';
import { doc, query, where, orderBy, setDoc, getDocs, getDoc, collection } from 'firebase/firestore';

export default class SoundsController extends Controller {
  @tracked soundbytes = [];
  @tracked isCreateSoundbyteOpen = false;
  @tracked showPopup = false;
  
  @service router;
  @service auth;
  @service firebase;

  @tracked cat = "temp";
  
  unsub = null;

  constructor() {
    super(...arguments);
    // this.router.refresh();
    this.addObserver('model', this, 'onModelChange');
  }

  onModelInit(){
    // this.router.refresh();
    // console.log("INit");
  }

  onModelChange() {
    // this.router.refresh();
    this.soundbytes = this.model;
    console.log("\\\\\\??!?!?!?");
    console.log(this.cat);
    const ref = collection(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'soundbytes',
    );
    const ref2 = query(
        ref,
        where('category', '==', this.cat),
        orderBy('timestamp', 'desc'),
    );
    this.unsub = onSnapshot(ref2, (collection) => {
      const data = collection.docs.map((d) => {
        return {
          ...d.data(),
          id: d.id,
        };
      });

      console.log(data);
      console.log('^');
      this.soundbytes = data;
    });
  }

  // Using arrow function automatically bind 'this' to the correct context, which is the controller in this case.
  //It is necessary because we pass closeCreateSoundbyte to the component, which needs the controller context
  openCreateSoundbyte = () => {
    this.isCreateSoundbyteOpen = true;
  };

  closeCreateSoundbyte = () => {
    this.isCreateSoundbyteOpen = false;
  };

  popup = () => {
    this.showPopup = true;
  };
  unpop = () => {
    this.showPopup = false;
  };

  getCat = () => {
    return this.cat;
  };
}
