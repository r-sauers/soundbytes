import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';
import WaveSurfer from 'wavesurfer.js';
import {
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
import { deleteObject, ref } from 'firebase/storage';

export default class ToDoEditable extends Component {
  @service firebase;
  @service auth;
  @service router;

  @tracked archived = undefined;
  @tracked volume = 0.5; //I think we could have a service to increase/decrease volume and play/pause, so we could save volume across sounds?
  @tracked status = 'paused';
  @tracked offset = 0; //this might not be needed, need to look int wave api
  @tracked showMoreActions = false;

  id;

  wavesurfer = null;

  constructor() {
    super(...arguments);
    const sb = this.args.soundbyte;
    this.id = sb.id;
    this.archived = sb.archived;
    this.audioURL = sb.url;
  }

  @action
  toggleMoreActions() {
    this.showMoreActions = !this.showMoreActions;
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
    this.wavesurfer.on('finish', () => {
      this.status = 'finished';
    });
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
  restartPlayback() {
    this.wavesurfer.setTime(0);
    this.wafesurfer.play();
    this.status = 'playing';
  }

  @action
  skipForward() {
    const seconds = 10;
    this.wavesurfer.skip(seconds);
  }

  @action
  skipBackward() {
    const seconds = 10;
    this.wavesurfer.skip(-seconds);
    if (this.status == 'finished') {
      this.status = 'paused';
    }
  }

  @action
  async togglePlayback() {
    if (this.wavesurfer.isPlaying()) {
      this.wavesurfer.pause();
      this.status = 'paused';
    } else {
      if (this.status == 'finished') {
        this.wavesurfer.setTime(0);
      }
      this.wavesurfer.play();
      this.status = 'playing';
    }
  }

  @action
  async closeMoreActions(evt) {
    const clickedName = evt.relatedTarget?.name;
    if (!clickedName) {
      this.showMoreActions = false;
    } else if (
      clickedName != 'delete-soundbyte' &&
      clickedName != 'move-soundbyte'
    ) {
      this.showMoreActions = false;
    }
  }

  @action
  async delete() {
    this.showMoreActions = false;
    Swal.fire({
      title: 'Delete soundbyte?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      confirmButtonText: 'Delete!',
    }).then(async (result) => {
      /* Read more about isConfirmed, isDenied below */
      if (result.isConfirmed) {
        await this.auth.ensureInitialized();
        const sbRef = doc(
          this.firebase.db,
          'users',
          this.auth.user.email,
          'soundbytes',
          this.id,
        );
        await deleteDoc(sbRef);
      }
    });
  }
}
