import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class Nav extends Component {
  @service router;

  @tracked projects = [];

  constructor() {
    super(...arguments);
    this.projects = [
      {
        name: 'test',
      },
    ];
  }

  @action
  logout() {
    this.router.transitionTo('splash');
  }

  @action
  createProject(evt) {
    evt.preventDefault();

    let projectName = evt.target.project_name.value;
    let project = {
      name: projectName,
    };
    this.projects = [...this.projects, project];
  }
}
