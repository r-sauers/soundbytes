import Component from '@glimmer/component';
import { action } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class Nav extends Component {
  @service router;
  @service auth;
  @service firebase;
  @service category;
  catUnsub = null;

  @tracked projects = [];

  constructor() {
    super(...arguments);

    this.projects = [];
    const THIS = this;
    this.category.ensureInit().then(async () => {
      THIS.projects = await THIS.category.getCategories();

      THIS.router.on('routeWillChange', () => {
        document.body.style.overflowY = 'scroll';
      });

      THIS.catUnsub = THIS.category.addListener(
        THIS.category.EVENT.ALL,
        (event, data) => {
          switch (event) {
            case THIS.category.EVENT.ARCHIVE:
            case THIS.category.EVENT.UNARCHIVE:
            case THIS.category.EVENT.REMOVE:
              THIS.setProjects(data);
              break;
            case THIS.category.EVENT.ADD:
              THIS.setProjects([...THIS.projects, data]);
              break;
          }
        },
        THIS.category.GET_OPTION.UNARCHIVED,
      );
    });
  }

  setProjects(projects) {
    this.projects = JSON.parse(JSON.stringify(projects));
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
    this.category.addCategory(projectName);
  }

  @action
  archiveProject(name) {
    this.category.archiveCategory(name);
  }

  willDestroy() {
    super.willDestroy();
    if (this.catUnsub) {
      this.catUnsub();
    }
  }
}
