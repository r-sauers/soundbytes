import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class SoundByIdRoute extends Route {
    async model(params) {
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