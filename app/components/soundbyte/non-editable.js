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

  @tracked volume = 0.5; //I think we could have a service to increase/decrease volume and play/pause, so we could save volume across sounds?
  @tracked status = 'paused';
  @tracked offset = 0; //this might not be needed, need to look int wave api

  wavesurfer = null;

  constructor() {
    super(...arguments);
    const welcome = this.args.welcome;
    this.id = welcome.id;
    this.audioURL = welcome.url;
  }

  @action
  initWaveSurfer() {
    console.log(this.id)
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
}