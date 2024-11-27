import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class SplashController extends Controller {
  @service router;

  @action
  login() {
    this.router.transitionTo('sounds');
  }
}
