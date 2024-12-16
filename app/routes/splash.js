import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { doc, setDoc, getDocs, getDoc, collection } from 'firebase/firestore';

export default class SplashRoute extends Route {

    @service auth;
    async beforeModel(){
        this.auth.requireLogout();
    }

    async model() {
        const data = await fetch("/soundbytes/attributes.json");
        return await data.json();
    }
}
