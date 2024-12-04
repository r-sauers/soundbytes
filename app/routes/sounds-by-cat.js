import Route from '@ember/routing/route';
import { service } from '@ember/service';


export default class SoundsByCatRoute extends Route {

    @service auth;

    async beforeModel(){
        await this.auth.requireLogin();
    }
}
