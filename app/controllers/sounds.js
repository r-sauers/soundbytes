import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';

export default class SoundsController extends Controller {
  @tracked soundbytes = [];

  constructor() {
    super(...arguments);

    this.soundbytes = [
      {
        id: 1,
        name: 'Fun Tune',
        description: `A short cheerful tune. It will quickly make you dance out, \
and before you know it you will have listened to it so much you are annoyed.`,
        audioURL: 'http://localhost:4200/sound1.mp3',
        archived: false,
        displayDate: '11/27/24',
      },
      {
        id: 2,
        name: 'Fun Tune 2',
        description: `A short cheerful tune. It will quickly make you dance out, \
and before you know it you will have listened to it so much you are annoyed.`,
        audioURL: 'http://localhost:4200/sound1.mp3',
        archived: false,
        displayDate: '11/27/24',
      },
    ];
  }
}
