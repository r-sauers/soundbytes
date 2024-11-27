import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { ref, getDownloadURL, uploadBytes, } from "firebase/storage";
import { doc, setDoc, getDocs, getDoc } from 'firebase/firestore';

export default class CreateSoundbyte extends Component {
    @service router;
    @service firebase;
    @service auth;

    @tracked isRecording = false;

    //array to store audio blob chunks. Blobs are immutable, otherwise would append them.
    recordedChunks = [];
    //variable to track currently recording audio chunk
    currentChunk = null;
    //recorder object that must be recreated with every recording
    recorder = null;
    //audio url for the user to play back recorded audio
    audioURL = null;
   
    @action
    async commitSoundbyte() {
        console.log("committing soundbyte");
        if (this.recorder && this.recorder.state === "inactive" && this.recordedChunks.length > 0) {
            //delete audio URL if present
            this.destroyAudioURL();
            //create a new audio blob from the array of audio chunks
            const audioBlob = new Blob(this.recordedChunks, { type: 'audio/webm' });
            this.recordedChunks = [];
            //update the storage, which makes our audio accessible by url
            const nextID = await this.getNextSoundbyteID(); //these can probably be implemented by a service since it will be a common function
            await this.updateNextSoundbyteID();
            const fileRef = ref(this.firebase.storage, `audio/users/${this.auth.user.email}/${nextID.toString()}.mp3`);
            await uploadBytes(fileRef, audioBlob);
            //update firestore. The soundbyte object will contain the url that has the audio data
            const d = doc(this.firebase.db, 'users', this.auth.user.email, 'soundbytes', nextID.toString());
            const url = await getDownloadURL(fileRef);
            await setDoc(d, {
                timestamp: Date.now(),
                archived: false,
                url: url,
            });
            //reset the recorder
            this.recorder = null;
            await this.createRecorder();
            //refresh the page to show the new soundbyte
            this.router.refresh();
        } else {
            this.showTryAgainPopup();
        }
    }

    @action
    async toggleRecording() {
        console.log("toggling pause play btn");
        if (this.isRecording) {
            //stop recording
            if (this.recorder && this.recorder.state === 'recording') {
                this.recorder.stop();
                //push the recording onto our saved chunks
                this.recordedChunks.push(this.currentChunk);
                this.currentChunk = null;
            } else {
                //if we try to stop recorder before it exists. This shouldn't technically happen
                this.showTryAgainPopup();
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
                this.showTryAgainPopup();
            }
        }
        this.isRecording = !this.isRecording;
    }

    //this can be called even if a recording is in process
    @action
    resetRecorder() {
        console.log("resetting recorder");
        if (this.recorder && this.recorder.state == 'recording') {
            this.recorder.stop();
        }
        this.destroyAudioURL();
        this.recordedChunks = [];
        this.currentChunk = null;
    }

    //audio files are treated as just another recording. They can be used
    //in conjunction with other user inputs and are sequenced according to  the input order
    @action
    handleAudioFile(event) {
        console.log("uploading audio");
        const file = event.target.files[0];
        if (file) {
            this.audioURL = URL.createObjectURL(file);
            const blob = new Blob([file], { type: file.type })
            this.recordedChunks.push(audioBlob);
        }
    }

    //make this a toggle when you get everything else to work
    @action
    async playbackAudio() {
        
        console.log("playing back audio")
        if (this.recordedChunks.length < 1) {
            console.log("Can't play back, no recording provided");
            return;
        }
        //if audioURL is set, no need to recreate a URL. just stream from it.
        if (!this.audioURL) {
            console.log("Audio URl doesn't exist, creating one");
            //combine chunks into a blob
            const audioBlob = new Blob(this.recordedChunks, { type: 'audio/mp3' });
            //create a URL from Blob so to stream audio from
            console.log(`created an audio blob of length ${audioBlob.size} from ${this.recordedChunks.length} recordings`);
            this.audioURL = URL.createObjectURL(audioBlob);
            console.log(`Audio URL is now: ${this.audioURL}`);
        }
        const audio = new Audio(this.audioURL);
        await audio.play();
        console.log("played audio");
    }
  
    async createRecorder() {
        console.log("creating recorder")
        //if the browser doesn't support recording
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            console.log("browser does not support audio recording")
            this.showBrowserErrorPopup();
            return;
        }
        //create recorder
        const stream = await navigator.mediaDevices.getUserMedia({audio: true})
        this.recorder = new MediaRecorder(stream);
        //save recording data in our current audio chunk variable
        this.recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.currentChunk = event.data;
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
        const d = doc(this.firebase.db, 'users', this.auth.user.email, 'userData', 'soundbyteMetaData');
        const docSnap = await getDoc(d);
        if (docSnap.exists()) {
            const current = docSnap.data().nextID;
            await setDoc(d, {nextID: current+1})
        } else { //just in case
            await setDoc(d, {nextID: 1});
        }
    }

    // Clean up the URL when component is destroyed for any reason (like on route change)
    willDestroy() {
        console.log("called willDestroy");
        this.destroyAudioURL();
        super.willDestroy();
    }

    destroyAudioURL() {
        console.log("destroying audio URL")
        if (this.audioURL) {
            URL.revokeObjectURL(this.audioUrl);
            this.audioURL = null;
        }
    }

    //good enough for now
    showTryAgainPopup() {
        console.alert("Please try again");
    }

    //good enough for now
    showBrowserErrorPopup() {
        console.alert("Incompatible Browser");
    }
    
}