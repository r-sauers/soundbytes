import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class ArchivedRoute extends Route {
    async model() {
    //ensure user is logged in
    try {
        await this.auth.ensureInitialized();
        await this.auth.ensureLoggedIn();
    } catch (error) {
        console.log(error);
        this.router.transitionTo('index');
    }
        return
    }
}