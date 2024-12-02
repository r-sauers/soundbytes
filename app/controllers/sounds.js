import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { onSnapshot, collection } from 'firebase/firestore';

export default class SoundsController extends Controller {
  @tracked soundbytes = [];
  @tracked isCreateSoundbyteOpen = false;

  @service auth;
  @service firebase;

  unsub = null;

  constructor() {
    super(...arguments);

    this.addObserver('model', this, 'onModelChange');
  }

  onModelChange() {
    this.soundbytes = this.model;

    const ref = collection(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'soundbytes',
    );
    this.unsub = onSnapshot(ref, (collection) => {
      const data = collection.docs.map((d) => {
        return {
          ...d.data(),
          id: d.id,
        };
      });

      console.log(data);
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

}
