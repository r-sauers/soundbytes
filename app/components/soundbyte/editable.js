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

  @tracked editingName = false;
  @tracked name = '';
  @tracked editingDescription = false;
  @tracked description = '';

  isDestroyed = false;
  id = undefined;
  displayDate = '';

  audioBlob = null;
  audioExt = '';
  wavesurfer = null;

  constructor() {
    super(...arguments);
    const sb = this.args.soundbyte;
    this.id = sb.id;
    this.archived = sb.archived;
    this.name = sb.name;
    this.description = sb.description;
    this.url = sb.url;
    let date = new Date(sb.timestamp);
    let hour = ((date.getHours() + 11) % 12) + 1;
    let meridian = date.getHours() / 12 < 1 ? 'AM' : 'PM';
    this.displayDate = `${date.toDateString()} ${hour}:${date.getMinutes()} ${meridian}`;
  }

  async initAudioBlob(url) {
    const resp = await fetch(url);
    this.audioBlob = await resp.blob();
    this.audioExt = url.slice(url.lastIndexOf('.'), url.lastIndexOf('?'));
  }

  @action
  async updateName(evt) {
    let nameValue = '';
    if (evt.type == 'focusout') {
      nameValue = evt.target.value;
    } else if (evt.type == 'submit') {
      evt.preventDefault();
      nameValue = evt.target['soundbyteName'].value;
    }

    const sbRef = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'soundbytes',
      this.id,
    );

    try {
      await updateDoc(sbRef, {
        name: nameValue,
      });

      this.editingName = false;
      this.name = nameValue;
    } catch (err) {
      console.log(err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: `We couldn't update the soundbyte name!`,
      });
      this.editingName = false;
    }
  }

  @action
  beginEditName() {
    this.editingName = true;
  }

  @action
  async updateDescription(evt) {
    let description = '';
    if (evt.type == 'focusout') {
      description = evt.target.value;
    } else if (evt.type == 'submit') {
      evt.preventDefault();
      description = evt.target['soundbyteDescription'].value;
    } else if (evt.type == 'keypress') {
      if (evt.key === 'Enter' && !evt.shiftKey) {
        evt.preventDefault();
        const newEvent = new Event('submit', { cancelable: true });
        evt.target.form.dispatchEvent(newEvent);
      }
      return;
    }

    const sbRef = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'soundbytes',
      this.id,
    );

    try {
      await updateDoc(sbRef, {
        description: description,
      });

      this.editingDescription = false;
      this.description = description;
    } catch (err) {
      console.log(err);
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: `We couldn't update the soundbyte description!`,
      });
      this.editingDescription = false;
    }
  }

  @action
  beginEditDescription() {
    this.editingDescription = true;
  }

  @action
  toggleMoreActions() {
    this.showMoreActions = !this.showMoreActions;
  }

  /* https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server */
  download(blob, filename) {
    var element = document.createElement('a');
    element.setAttribute('href', URL.createObjectURL(blob));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  @action
  share() {
    let name = this.name;
    if (!name) {
      name = 'soundbyte';
    }
    const audioFile = new File([this.audioBlob], name + this.audioExt, {
      type: this.audioBlob.type,
    });
    if (navigator.canShare && navigator.canShare({ files: [audioFile] })) {
      navigator
        .share({
          files: [audioFile],
          title: 'Vacation Pictures',
          text: 'Photos from September 27 to October 14.',
        })
        .then(() => console.log('Share was successful.'))
        .catch((error) => console.log('Sharing failed', error));
    } else {
      console.log(`Your system doesn't support sharing files.`);
      this.download(this.audioBlob, name + this.audioExt);
    }
  }

  @action
  initWaveSurfer() {
    this.initAudioBlob(this.url).then(() => {
      if (!this.wavesurfer) {
        this.wavesurfer = WaveSurfer.create({
          container: `#waveform-${this.id}`,
          waveColor: 'violet',
          progressColor: 'purple',
          height: 100,
          barWidth: 3,
        });
        const idk = this;
        this.wavesurfer.load(URL.createObjectURL(this.audioBlob)).then(() => {
          if (idk.isDestroyed) {
            idk.wavesurfer.destroy();
          }
        });
        this.wavesurfer.on('finish', () => {
          this.status = 'finished';
        });
      }
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

  willDestroy() {
    super.willDestroy();
    this.isDestroyed = true;
  }
}
