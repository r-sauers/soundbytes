import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import WaveSurfer from 'wavesurfer.js';

export default class ToDoEditable extends Component {
  @tracked status = 'paused';
  @tracked repeating = false;
  @tracked offset = 0; //this might not be needed, need to look int wave api
  @tracked showMoreActions = false;

  name = '';
  archived = undefined;
  description = '';
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
    this.transcribed = sb.transcribed || 'Not transcribed';
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
          waveColor: '#B10678',
          progressColor: '#F715AB',
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
          if (this.repeating) {
            this.wavesurfer.play();
          } else {
            this.status = 'finished';
          }
        });
      }
    });
  }

  @action
  restartPlayback() {
    this.wavesurfer.loadBlob(this.audioBlob); //needed bc wavesurfer seekTo(0) isn't working
    this.wafesurfer.play();
    this.status = 'playing';
  }

  @action
  toggleRepeat() {
    this.repeating = !this.repeating;
  }

  @action
  async skipForward() {
    const seconds = 10;
    this.wavesurfer.skip(seconds);
  }

  @action
  skipBackward() {
    const seconds = 10;
    const time = this.wavesurfer.getCurrentTime();
    if (time - seconds <= 0) {
      this.wavesurfer.pause();
      this.status = 'paused';
    }
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
  async transcribe() {
    this.showMoreActions = false;
    Swal.fire({
      title: 'Speech To Text',
      html: `<div class="spinner-border text-primary" role="status">
  <span class="visually-hidden">Loading...</span>
</div>`,
    });
    const htmlEl = Swal.getHtmlContainer();
    htmlEl.innerHTML = this.transcribed;
  }

  willDestroy() {
    super.willDestroy();
    this.isDestroyed = true;
  }
}
