import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export default class CreateSoundbyte extends Component {
  @service router;
  @service firebase;
  @service auth;

  @tracked isRecording = false;
  @tracked started = false;

  //array to store audio blob chunks. Blobs are immutable, otherwise would append them.
  recordedChunks = [];
  //recorder object that must be recreated with every recording
  recorder = null;
  //audio url for the user to play back recorded audio
  audioURL = null;

  //this function is passed from the controller to the component, since the component is a popup and can't close itself.
  @action close() {
    this.args.close();
  }

  @action start() {
    this.started = true;
  }

  @action
  async commitSoundbyte() {
    if (!this.recorder || this.recordedChunks.length < 1) {
      this.popup('Upload a sound before you commit');
    } else if (this.recorder.state !== 'inactive') {
      this.popup('Stop recording before you commit');
    } else {
      //delete audio URL if present
      this.destroyAudioURL();
      //create a new audio blob from the array of audio chunks
      const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      this.recordedChunks = [];
      //update the storage, which makes our audio accessible by url
      const nextID = await this.getNextSoundbyteID(); //these can probably be implemented by a service since it will be a common function
      await this.updateNextSoundbyteID();
      const fileRef = ref(
        this.firebase.storage,
        `audio/users/${this.auth.user.email}/${nextID.toString()}.webm`,
      );
      await uploadBytes(fileRef, audioBlob);
      //update firestore. The soundbyte object will contain the url that has the audio data
      const d = doc(
        this.firebase.db,
        'users',
        this.auth.user.email,
        'soundbytes',
        nextID.toString(),
      );
      const url = await getDownloadURL(fileRef);
      await setDoc(d, {
        timestamp: Date.now(),
        archived: false,
        url: url,
        description: null,
        name: null,
        date_archived: null,
      });
      //reset the recorder
      this.recorder = null;
      this.close();
    }
  }

  @action
  async toggleRecording() {
    if (this.isRecording) {
      //stop recording
      if (this.recorder && this.recorder.state === 'recording') {
        this.recorder.stop();
      } else {
        //if we try to stop recorder before it exists. This shouldn't technically happen
        this.popup('Something went wrong. Please try again later');
      }
    } else {
      //start recording. We have to create a new recorder every time we record new audio
      await this.createRecorder();
      //destroy the audio url. IT is being updated, so no longer relevant.
      this.destroyAudioURL();
      if (this.recorder && this.recorder.state === 'inactive') {
        this.recorder.start();
      } else {
        //if we try to start recorder before it exists. This shouldn't technically happen
        this.popup('something went wrong. Please try again later');
      }
    }
    this.isRecording = !this.isRecording;
  }

    //this can be called even if a recording is in process
    @action
    resetRecorder() {
        if (this.recorder && this.recorder.state == 'recording') {
            this.recorder.stop();
        }
        this.destroyAudioURL();
        this.recordedChunks = [];
    }

    //audio files are treated as just another recording. They can be used
    //in conjunction with other user inputs and are sequenced according to  the input order
    @action
    async handleAudioFile(event) {
        const file = event.target.files[0];
        console.log(file.type);
        if (file) {
            //convert it to webm if mp3
            if (file.type === "audio/mpeg") {
                // const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
                const ffmpeg = new FFmpeg();
                // console.log("hi")
                // await ffmpeg.load({
                //     coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
                //     wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
                // });
                await ffmpeg.load();
                console.log("hi2")
                const fileData = await fetchFile(file);
                console.log("hi3")
                await ffmpeg.writeFile('input.mp3', fileData);
                await ffmpeg.exec(['-i', 'input.mp3', '-c:a', 'libopus', 'output.webm']);
                const outputData = await ffmpeg.readFile('output.webm');
                const audioBlob = new Blob([outputData.buffer], { type: 'audio/webm' });
                this.recordedChunks.push(audioBlob);
            }
            else if (file.type === "audio/webm") {
                const audioBlob = new Blob([file], { type: 'audio/webm' });
                this.recordedChunks.push(audioBlob);
            }
            else {
                this.popup("Unsupported file type");
            }
            let inputElement = event.target;
            inputElement.value = null;
            console.log("chunks is ", this.recordedChunks.size, " parts long")
        }
        else {
            this.popup("Try again");
        }
    }

    //make this a toggle when you get everything else to work
    @action
    async playbackAudio() {
        if (this.recordedChunks.length < 1) {
            this.popup("Audio not provided");
            return;
        }
        //if audioURL is set, no need to recreate a URL. just stream from it.
        if (!this.audioURL) {
            //combine chunks into a blob
            const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
            //create a URL from Blob so to stream audio from
            this.audioURL = URL.createObjectURL(audioBlob);
        }
        const audio = new Audio(this.audioURL);
        if (!audio.canPlayType('audio/webm')) {
            this.popup("Your browser doesn't support playing webm audio files");
            return;
        }
        await audio.play(); //this is giving us issues
    }

    async createRecorder() {
        //if the browser doesn't support recording
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            this.popup("Your browser doesn't support audio recording");
            return;
        }
        //create recorder
        const stream = await navigator.mediaDevices.getUserMedia({audio: true})
        this.recorder = new MediaRecorder(stream, {mimeType: 'audio/webm'}); //MediaRecorder only accepts webm types
        //save recording data in our current audio chunk variable. This is called after this.recorder.stop() is called
        this.recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.recordedChunks.push(event.data);
            }
        }
    }

    async getNextSoundbyteID() {
      const d = doc(this.firebase.db, 'users', this.auth.user.email, 'userData', 'soundbyteMetaData');
      const docSnap = await getDoc(d);
      //if todoMetaData exists, return nextID. If not, make nextID 0 and return it.
      if (docSnap.exists()) {
        return docSnap.data().nextID;
      }
      await setDoc(d, {nextID: 0});
      return 0;
    }

  async updateNextSoundbyteID() {
    const d = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'userData',
      'soundbyteMetaData',
    );
    const docSnap = await getDoc(d);
    if (docSnap.exists()) {
      const current = docSnap.data().nextID;
      await setDoc(d, { nextID: current + 1 });
    } else {
      //just in case
      await setDoc(d, { nextID: 1 });
    }
  }

    popup(message) {
        // this.args.popup(message);
        alert(message);
    }

  // Clean up the URL when component is destroyed for any reason (like on route change)
  willDestroy() {
    this.destroyAudioURL();
    super.willDestroy();
  }

  destroyAudioURL() {
    if (this.audioURL) {
      URL.revokeObjectURL(this.audioURL);
      this.audioURL = null;
    }
  }
}
