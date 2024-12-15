import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { action } from '@ember/object';
import { onSnapshot } from 'firebase/firestore';
import { query, where, orderBy, collection } from 'firebase/firestore';

export default class SoundsController extends Controller {
  @tracked soundbytes = [];
  @tracked isCreateSoundbyteOpen = false;
  @tracked showPopup = false;

  @service router;
  @service auth;
  @service firebase;
  @service category;

  @tracked catArchived = false;
  @tracked catName = '';
  catUnsub = null;

  unsub = null;

  constructor() {
    super(...arguments);
    this.addObserver('model', this, 'onModelChange');
  }

  onModelChange() {
    this.soundbytes = this.model.soundbytes;
    this.catName = this.model.category.name;
    this.catArchived = this.model.category.archived;

    this.catUnsub = this.category.addListener(
      this.category.EVENT.ARCHIVE | this.category.EVENT.UNARCHIVE,
      (event, data) => {
        this.catArchived = data.archived;
      },
      this.catName,
    );

    const ref = collection(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'soundbytes',
    );
    const ref2 = query(
      ref,
      where('category', '==', this.catName),
      orderBy('timestamp', 'desc'),
    );
    this.unsub = onSnapshot(ref2, (collection) => {
      const data = collection.docs.map((d) => {
        return {
          ...d.data(),
          id: d.id,
        };
      });

      this.soundbytes = data;
    });
  }

  @action
  archive() {
    this.category.archiveCategory(this.catName);
  }

  @action
  unarchive() {
    this.category.unarchiveCategory(this.catName);
  }

  @action
  delete() {
    this.category.removeCategory(this.catName);
    this.router.transitionTo('archived');
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
    return this.catName;
  };

  willDestroy() {
    if (this.unsub) {
      this.unsub();
    }
    if (this.categoryUnsub) {
      this.catUnsub();
    }
  }
}
