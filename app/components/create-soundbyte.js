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
  // @tracked cat = null;

  //array to store audio blob chunks. Blobs are immutable, otherwise would append them.
  recordedChunks = [];
  recordedLabels = [];
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

  updateIndicator() {
    const indicator = document.getElementById('sound-indicator');
    if (this.recordedChunks.length === 0) {
      indicator.innerHTML = 'Record or upload a file!';
      return;
    }
    indicator.innerHTML = '';
    let totalBlobSize = 0;
    for (const blob of this.recordedChunks) {
      totalBlobSize += blob.size;
    }
    let i = 0;
    for (const blob of this.recordedChunks) {
      const div = document.createElement('div');
      div.className = 'd-inline-block m-0 fs-6 text-center align-middle text-light overflow-hidden';
      const hue = i * 40;
      div.style.backgroundColor = `hsl(${hue}deg,50%,50%)`;
      div.innerText = this.recordedLabels[i];
      div.style.width = `${(blob.size / totalBlobSize) * 100}%`;
      div.style.height = `40px`;
      indicator.appendChild(div);
      i++;
    }
  }

  async concatBlobs(blobs) {
    // return new Blob(blobs, { type: 'audio/webm' });
    // Step 1: Extract raw binary data from all blobs
    let totalLength = 0;
    const dataBuffers = [];

    // Read each blob as an ArrayBuffer and extract data
    for (let blob of blobs) {
      const arrayBuffer = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsArrayBuffer(blob);
      });

      dataBuffers.push(new Uint8Array(arrayBuffer));  // Store data as Uint8Array for easy concatenation
      totalLength += arrayBuffer.byteLength;
    }

    // Step 2: Concatenate all data buffers into one large Uint8Array
    const concatenatedArray = new Uint8Array(totalLength);
    let offset = 0;
    dataBuffers.forEach(buffer => {
      concatenatedArray.set(buffer, offset);
      offset += buffer.length;
    });

    // Step 3: Create the combined Blob (if necessary, create a new header)
    const newBlob = new Blob([concatenatedArray], { type: 'audio/webm' });
    return newBlob;
  }

  @action triggerFileInput() {
    const fileUpload = document.getElementById("file-upload");
    console.log("hi")
    fileUpload.click();
  }

  @action
  async commitSoundbyte() {
    if (this.recordedChunks.length < 1) {
      this.popup('Upload a sound before you commit');
      return
    }
    //pause if we are recording
    if (this.recorder && this.recorder.state !== 'inactive') {
        this.recorder.pause();
        this.isRecording = false;
    }
      //delete audio URL if present
      this.destroyAudioURL();
      //create a new audio blob from the array of audioblobs
      // const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
      const audioBlob = await this.concatBlobs(this.recordedChunks);
      this.recordedChunks = [];
      this.recordedLabels = [];
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
      var cat;
      try {
        cat = this.args.cat();
      }catch (error){
        cat = null;
      }

      await setDoc(d, {
        timestamp: Date.now(),
        url: url,
        description: null,
        name: null,
        date_archived: null,
        category: cat,
        transcribed: null,
        archived: false
      });
      //reset the recorder
      this.recorder = null;
      this.close();
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
        return;
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
        return;
      }
    }
    this.isRecording = !this.isRecording;
  }

  //this can be called even if a recording is in process
  @action
  resetRecorder() {
    this.close();
  }

    //audio files are treated as just another recording. They can be used
    //in conjunction with other user inputs and are sequenced according to  the input order
    @action
    async handleAudioFile(event) {
        const file = event.target.files[0];
        if (file && file.type == "audio/webm" || file.type == 'video/webm') {
            //convert the file into a blob, then push the blob
            const audioBlob = new Blob([file], { type: 'audio/webm' });
            this.recordedChunks.push(audioBlob);
            this.recordedLabels.push(file.name);
            this.updateIndicator();
        } else {
            this.popup("Unsupported file type");
        }
        let inputElement = event.target;
        inputElement.value = null;
    }

    //make this a toggle when you get everything else to work
    @action
    async playbackAudio() {
        if (this.recordedChunks.length < 1) {
            this.popup("Audio not provided");
            return;
        }
        if (this.recorder && this.recorder.state == 'recording') {
          this.recorder.pause();
          this.isRecoring = false;
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
                this.recordedLabels.push('sound');
                this.updateIndicator();
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
    Swal.fire({
      icon: 'error',
      title: 'Oops...',
      text: message,
    });
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
