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

    for (const id in this.listeners) {
      this.listeners[id](value);
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
  _removeListener(id) {
    delete this.listeners[id];
  }
  clearListeners() {
    this.listeners = {};
  }
}
