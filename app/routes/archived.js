import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ArchivedRoute extends Route {
  @service router;
  @service auth;
  
  async model() {
    //ensure user is logged in
    try {
      await this.auth.ensureInitialized();
      await this.auth.ensureLoggedIn();
    } catch (error) {
      console.log(error);
      this.router.transitionTo('index');
    }

    const archived_projects = [
      {
        name: 'test',
        date_archived: 'Dec 25, 2023',
      },
    ];
    return archived_projects;
  }
}
