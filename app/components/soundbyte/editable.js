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
import { deleteObject, getBlob, ref } from 'firebase/storage';

export default class ToDoEditable extends Component {
  @service firebase;
  @service auth;
  @service router;
  @service textToSpeech;

  @tracked archived = undefined;
  @tracked volume = 0.5; //I think we could have a service to increase/decrease volume and play/pause, so we could save volume across sounds?
  @tracked status = 'paused';
  @tracked offset = 0; //this might not be needed, need to look int wave api
  @tracked showMoreActions = false;

  @tracked editingName = false;
  updatingName = false;
  @tracked name = '';
  @tracked editingDescription = false;
  updatingDescription = false;
  @tracked description = '';

  isDestroyed = false;
  id = undefined;
  displayDate = '';
  cat = undefined;

  audioBlob = null;
  audioExt = '';
  @tracked wavesurfer = null;

  constructor() {
    super(...arguments);
    const sb = this.args.soundbyte;
    this.id = sb.id;
    this.archived = sb.archived;
    this.name = sb.name;
    this.cat = sb.category;
    this.description = sb.description;
    this.url = sb.url;
    this.transcribed = sb.transcribed;
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
    if (!this.editingName || this.updatingName) {
      evt.preventDefault();
      return;
    }
    this.updatingName = true;

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

    this.updatingName = false;
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

    if (!this.editingDescription || this.updatingDescription) {
      evt.preventDefault();
      return;
    }
    this.updatingDescription = true;

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

    this.updatingDescription = false;
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
        const componentInstance = this;
        this.wavesurfer.load(URL.createObjectURL(this.audioBlob)).then(() => {
          if (componentInstance.isDestroyed) {
            componentInstance.wavesurfer.destroy();
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
    this.wavesurfer.loadBlob(this.audioBlob); //needed bc wavesurfer seekTo(0) isn't working
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
        this.wavesurfer.loadBlob(this.audioBlob); //needed bc wavesurfer seekTo(0) isn't working
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
      clickedName != 'move-soundbyte' &&
      clickedName != 'transcribe-soundbyte'
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
        //delete firebase storage object
        const fileRef = ref(
          this.firebase.storage,
          `audio/users/${this.auth.user.email}/${this.id}.webm`,
        );
        await deleteObject(fileRef);
      }
    });
  }

  @action
  async move() {
    var projectsInc;
    this.showMoreActions = false;
    const ref = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'userData',
      'soundbyteMetaData',
    );

    await getDoc(ref).then((docSnap) => {
      console.log(docSnap);
      projectsInc = docSnap.data();//.categories;
    })

    var projects2 = {temp: 'No Category'};
    for(var i = 0; i < projectsInc.categories.length; i++){
      projects2[projectsInc.categories[i].name] = projectsInc.categories[i].name;
    }

    // const currentProject = `No Project`;
    const currentProject = this.cat;

    Swal.fire({
      title: `Select Project`,
      html: `<i>Hint: Add more projects in the navigation sidebar!</i>`,
      input: `select`,
      inputOptions: projects2,
      inputValue: currentProject,
      showCancelButton: true,
      preConfirm: async (project) => {
        // Swal.showValidationMessage('Not Implemented!');
        // return false;
        if(project == 'temp'){
          project = null;
        }
        Swal.resetValidationMessage();
        try {
          await this.auth.ensureInitialized();
          const sbRef = doc(
            this.firebase.db,
            'users',
            this.auth.user.email,
            'soundbytes',
            this.id,
          );
          await updateDoc(sbRef, {category : project});
        } catch (err) {
          Swal.showValidationMessage('Something went wrong!');
          return false;
        }
      },
    });
  }

  @action
  async transcribe() {
    this.showMoreActions = false;
    Swal.fire({
      title: 'Speech To Text',
      html: `<div class="spinner-border text-primary" role="status">
  <span class="visually-hidden">Loading...</span>
</div>`,
    });
    const htmlEl = Swal.getHtmlContainer();

    try {
      if (!this.transcribed) {
        this.transcribed = await this.textToSpeech.transcribe(
          this.url,
          this.audioBlob,
        );

        try {
          await this.auth.ensureInitialized();
          const sbRef = doc(
            this.firebase.db,
            'users',
            this.auth.user.email,
            'soundbytes',
            this.id,
          );
          await updateDoc(sbRef, {
            transcribed: this.transcribed,
          });
        } catch (err) {
          console.log(err);
        }
      }
      htmlEl.innerHTML = this.transcribed;
    } catch (err) {
      console.log(err);
      htmlEl.innerHTML = `<span class="text-danger">${err}</span>`;
    }
  }

  willDestroy() {
    super.willDestroy();
    this.isDestroyed = true;
  }
}
