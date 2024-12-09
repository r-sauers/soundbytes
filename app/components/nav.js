import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { doc, updateDoc, getDoc} from 'firebase/firestore';

export default class Nav extends Component {
  @service router;
  @service auth;
  @service firebase;

  @tracked projects = [];

  constructor() {
    super(...arguments);

    const ref = doc(
      this.firebase.db,
      'users',
      this.auth.user.email,
      'userData',
      'soundbyteMetaData',
    );

    getDoc(ref).then((docSnap) => {
      console.log(docSnap);
      this.projects = docSnap.data().categories;
    })

    // this.projects = [
    //   {
    //     name: 'test',
    //   },
    // ];
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
}
