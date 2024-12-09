import Controller from '@ember/controller';
import { service } from '@ember/service';
import { action } from '@ember/object';

export default class SplashController extends Controller {
  @service router;
  @service auth;

  @action
  async login() {
    await this.auth.sign_in_with_popup();
    this.router.transitionTo('sounds');
  }
}
