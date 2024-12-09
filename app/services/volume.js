import Service from '@ember/service';

export default class VolumeService extends Service {
  volume = 0.5;
  newListenerId = 0;
  listeners = {};

  _getNewListenerId() {
    const temp = this.newListenerId;
    this.newListenerId++;
    return temp;
  }

  setVolume(value) {
    this.volume = value;

    for (const listener in this.listeners) {
      listener(value);
    }
  }
  getVolume() {
    return this.volume;
  }
  onVolumeChange(listener) {
    const id = this._getNewListenerId();
    this.listeners[id] = listener;

    const volumeServiceInstance = this;
    return () => {
      volumeServiceInstance._removeListener(id);
    };
  }
  addWaveSurferListener(wavesurfer) {
    wavesurfer.setVolume(this.volume);
    const removeListener = this.onVolumeChange((volume) => {
      wavesurfer.setVolume(volume);
    });
    wavesurfer.on(
      'destroy',
      () => {
        removeListener();
      },
      {
        once: true,
      },
    );
    return removeListener;
  }
  _removeListener(id) {
    delete this.listeners[id];
  }
  clearListeners() {
    this.listeners = {};
  }
}
