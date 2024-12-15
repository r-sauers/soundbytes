import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { doc, updateDoc, getDoc, collection, getDocs} from 'firebase/firestore';

export default class Nav extends Component {
  @service router;
  @service auth;
  @service firebase;

  @tracked projects = [];

  constructor() {
    super(...arguments);

    this.projects = [];

    const ref = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'userData',
      'soundbyteMetaData',
    );

    getDoc(ref).then((docSnap) => {
      console.log(docSnap.data());
      this.projects = docSnap.data().categories || [];
    });

    this.router.on('routeWillChange', (transition) => {
      document.body.style.overflowY = 'scroll';
    });
  }

  @action
  async logout() {
    this.router.transitionTo('splash');
    await this.auth.sign_out();
  }

  @action
  createProject(evt) {
    evt.preventDefault();

    let projectName = evt.target.project_name.value;
    let project = {
      name: projectName,
      archived: false,
      date_archived: null
    };
    this.projects = [...this.projects, project];
    const ref = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'userData',
      'soundbyteMetaData',
    );

    updateDoc(ref, {categories: this.projects});

  }

  @action 
  async archiveProject(name) {
    this.projects.forEach(cat => {
      //console.log(cat);
      if (cat.name == name) {
        cat.archived = true;
        cat.date_archived = Date.now();
      }
    });
    console.log(this.projects);
    const ref = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'userData',
      'soundbyteMetaData',
    );

    await updateDoc(ref, {categories: this.projects});
  }
}
