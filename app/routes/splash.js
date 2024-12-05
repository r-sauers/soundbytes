import Route from '@ember/routing/route';
import { service } from '@ember/service';
import { doc, setDoc, getDocs, getDoc, collection } from 'firebase/firestore';

export default class SplashRoute extends Route {
    async model() {
        let welcome = {
            url: '/welcome.webm',
            name: 'welcome',
            description: 'Here is an example',
            id: 0,
        }
        return welcome;
    }
}
