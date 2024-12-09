import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { onSnapshot, collection } from 'firebase/firestore';

export default class SoundsController extends Controller {
  @tracked soundbytes = [];
  @tracked isCreateSoundbyteOpen = false;
  @tracked showPopup = false;

  @service auth;
  @service firebase;

  modelInitialized = false;

  unsub = null;

  constructor() {
    super(...arguments);

    this.addObserver('model', this, 'onModelChange');
  }

  onModelInit() {
    this.soundbytes = this.model;
    console.log(this.soundbytes);

    const ref = collection(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'soundbytes',
    );
    this.unsub = onSnapshot(ref, (snapshot) => {
      const changes = snapshot.docChanges();

      // get the relevant changes to the collection (additions/deletions)
      // modifications aren't relevant to the collection
      const relevantChanges = changes.reduce((acc, change) => {
        if (change.type == 'modified') return acc;
        acc[change.doc.id] = {
          data: change.doc.data(),
          type: change.type,
          id: change.id,
        };
        return acc;
      }, {});

      if (relevantChanges) {
        let changed = false;

        // Remove deleted soundbytes
        let updated = this.soundbytes.filter((sb) => {
          let relevantChange = relevantChanges[sb.id];
          if (!relevantChange) return true;

          delete relevantChanges[sb.id];
          if (relevantChange.type == 'added') return true;

          changed = true;
          return false;
        });

        // Add new soundbytes
        for (let id in relevantChanges) {
          let relevantChange = relevantChanges[id];
          updated.push({ ...relevantChange.data, id: id });
          changed = true;
        }

        if (changed) this.soundbytes = updated;
      }
    });
  }

  onModelChange() {
    if (!this.modelInitialized) {
      this.onModelInit();
    }
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
}
