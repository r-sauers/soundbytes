import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class SoundsController extends Controller {
  @tracked soundbytes = [];
  @tracked isCreateSoundbyteOpen = false;

  constructor() {
    super(...arguments);
  }

  // Using arrow function automatically bind 'this' to the correct context, which is the controller in this case.
  //It is necessary because we pass closeCreateSoundbyte to the component, which needs the controller context
  openCreateSoundbyte = () => {
    this.isCreateSoundbyteOpen = true;
  };

  closeCreateSoundbyte = () => {
    this.isCreateSoundbyteOpen = false;
  };

}
