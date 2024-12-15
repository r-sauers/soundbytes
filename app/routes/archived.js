import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ArchivedRoute extends Route {
  @service router;
  @service auth;
  @service firebase;
  @service category;

  async model() {
    //ensure user is logged in
    try {
      await this.auth.ensureInitialized();
      await this.auth.ensureLoggedIn();
      await this.category.ensureInit();
    } catch (error) {
      console.log(error);
      this.router.transitionTo('splash');
    }

    return this.category.getCategories(this.category.GET_OPTION.ARCHIVED);
  }
}
