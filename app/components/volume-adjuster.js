import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class VolumeAdjuster extends Component {
  @service volume;
  @tracked adjustingVolume = false;
  @tracked rangeValue;

  constructor() {
    super(...arguments);
    this.rangeValue = this.volume.volume;
  }

  @action
  setButton(element) {
    this.button = element;
  }

  @action
  initWavesurfer() {
    const wavesurfer = this.args.wavesurfer;
    if (wavesurfer) {
      const unsub = this.volume.onVolumeChange((value) => {
        wavesurfer.setVolume(value);
        this.rangeValue = value;
      });
      wavesurfer.on('destroy', unsub, { once: true });
    }
  }

  @action
  endAdjustingVolume(evt) {
    if (this.button && evt.relatedTarget === this.button) return;
    this.adjustingVolume = false;
  }

  @action
  toggleAdjustingVolume() {
    this.adjustingVolume = !this.adjustingVolume;
  }

  @action
  adjustVolume(evt) {
    this.volume.setVolume(parseFloat(evt.target.value));
  }
}
