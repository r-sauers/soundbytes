import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import WaveSurfer from 'wavesurfer.js';
/*import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';*/

export default class ToDoEditable extends Component {
  @service firebase;
  @service auth;
  @service router;

  @tracked archived = undefined;
  @tracked volume = 0.5; //I think we could have a service to increase/decrease volume and play/pause, so we could save volume across sounds?
  @tracked paused = true;
  @tracked offset = 0; //this might not be needed, need to look int wave api

  id;

  wavesurfer = null;

  constructor() {
    super(...arguments);
    const sb = this.args.soundbyte;
    this.id = sb.id;
    this.archived = sb.archived;
    this.audioURL = sb.audioURL;
  }

  @action
  initWaveSurfer() {
    this.wavesurfer = WaveSurfer.create({
      container: `#waveform-${this.id}`,
      waveColor: 'violet',
      progressColor: 'purple',
      height: 100,
      barWidth: 3,
    });
    this.wavesurfer.load(this.audioURL);
  }

  /*
  @action
  async toggleArchived() {
    d = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'sound',
      this.args.id,
    );
    await updateDoc(d, {
      archived: !this.archived,
    });
    this.archived = !this.archived;
  }

  @action
  raiseVolume() {
    if (this.volume < 1) {
      this.volume += 0.05;
      this.wavesurfer.setVolume(this.volume);
    }
  }

  @action
  async lowerVolume() {
    if (this.volume >= 0) {
      this.volume -= 0.05;
      this.wavesurfer.setVolume(this.volume);
    }
  }

  @action
  async deleteSound() {
    //delete doc
    d = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'sound',
      this.args.sound.id,
    );
    await deleteDoc(d);
    //delete storage
    const audio = ref(this.firebase.storage, this.args.audioPath);
    await deleteObject(audio);
    //reroute to sounds feed
    this.router.transitionTo('sounds');
  }*/

  @action
  async togglePlayback() {
    if (this.wavesurfer.isPlaying()) {
      this.wavesurfer.pause();
    } else {
      this.wavesurfer.play();
    }
    this.paused = !this.paused;
  }
}
