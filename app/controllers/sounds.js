import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class SoundsController extends Controller {
  @tracked soundbytes = [];

  constructor() {
    super(...arguments);

    this.soundbytes = [
      {
        id: 1,
        name: 'test',
        audioURL: 'http://localhost:4200/sound1.mp3',
        archived: false,
      },
    ];
  }
}
