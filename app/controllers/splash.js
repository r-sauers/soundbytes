import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class SplashController extends Controller {
  @service router;
  @service auth;

  @action
  async login() {
    if (this.auth.loggedIn) {
      await this.auth.sign_out();
      this.router.transitionTo('index');
    } else await this.auth.sign_in_with_popup();
  }
}
