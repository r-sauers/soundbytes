import Controller from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';

export default class ArchivedController extends Controller {
  @service category;

  @tracked categories = [];

  catUnsub = null;

  constructor() {
    super(...arguments);
    this.category
      .ensureInit()
      .then(() => {
        return this.category.getCategories(this.category.GET_OPTION.ARCHIVED);
      })
      .then((categories) => {
        this.categories = categories;
        this.catUnsub = this.category.addListener(
          this.category.EVENT.ALL,
          (event, data) => {
            switch (event) {
              case this.category.EVENT.ARCHIVE:
              case this.category.EVENT.UNARCHIVE:
              case this.category.EVENT.REMOVE:
                this.categories = data;
                break;
            }
          },
          this.category.GET_OPTION.ARCHIVED,
        );
      });
  }

  willDestroy() {
    super.willDestroy();
    if (this.catUnsub) {
      this.catUnsub();
    }
  }
}
