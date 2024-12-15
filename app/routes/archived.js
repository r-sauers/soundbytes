import Route from '@ember/routing/route';
import { service } from '@ember/service';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';

export default class ArchivedRoute extends Route {
  @service router;
  @service auth;
  @service firebase;

  async model() {
    //ensure user is logged in
    try {
      await this.auth.ensureInitialized();
      await this.auth.ensureLoggedIn();
    } catch (error) {
      console.log(error);
      this.router.transitionTo('splash');
    }

    const ref = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'userData',
      'soundbyteMetaData',
    );

    var archived_projects = [];

    var docSnap = await getDoc(ref);
    console.log(docSnap.data().categories);
    docSnap.data().categories.forEach(cat => {
      if (cat.archived) {
        var date = new Date(cat.date_archived);
        var display_date = "";
        display_date = date.getMonth()+1 + "/" + date.getDate() + "/" + date.getFullYear();
        cat.date_archived = display_date;
        archived_projects.push(cat);
      }
    });

    return archived_projects;
  }
}
