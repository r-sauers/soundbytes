import Service from '@ember/service';
import { service } from '@ember/service';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

export default class CategoryService extends Service {
  @service auth;
  @service firebase;

  EVENT = {
    ADD: 0b0001,
    ARCHIVE: 0b0010,
    UNARCHIVE: 0b0100,
    REMOVE: 0b1000,
    ALL: 0b1111,
  };

  GET_OPTION = {
    ARCHIVED: 0b01,
    UNARCHIVED: 0b10,
    ALL: 0b11,
  };

  MAX_NAME_RESOLVE_ITER = 10;
  INIT_FREQ = 100;
  INIT_TIMEOUT = 1000;

  constructed = false;

  docRef = null;
  listeners = {};
  newListenerId = 0;
  categories = [];
  _cat_dup = []; // used to recover from errors

  _deepCopy(object) {
    return JSON.parse(JSON.stringify(object));
  }

  constructor() {
    super(...arguments);

    const THIS = this;
    this.auth
      .ensureInitialized()
      .then(() => {
        return this.auth.ensureLoggedIn;
      })
      .then(() => {
        this.docRef = doc(
          this.firebase.db,
          'users',
          this.auth.user.email,
          'userData',
          'soundbyteMetaData',
        );

        return getDoc(this.docRef);
      })
      .then(async (docSnap) => {
        THIS.categories = docSnap.data().categories || [];
        THIS._cat_dup = THIS._deepCopy(THIS.categories);
        THIS.constructed = true;
      });
  }

  async ensureInit() {
    return new Promise((resolve, reject) => {
      if (this.constructed) resolve();
      let timeWaited = 0;
      let interval = setInterval(() => {
        timeWaited += this.INIT_FREQ;
        if (this.constructed) {
          clearInterval(interval);
          resolve();
        }
        if (timeWaited > this.INIT_TIMEOUT) {
          clearInterval(interval);
          reject('Category Service Initialization Timed Out');
        }
      }, this.INIT_FREQ);
    });
  }

  async getCategories(options = this.GET_OPTION.ALL) {
    await this.ensureInit();
    if (!this.categories) {
      throw 'Categories not loaded!';
    }

    const filtered = this._filterOption(this.categories, options);
    return filtered;
  }

  async getCategory(catName) {
    await this.ensureInit();
    for (const category of this.categories) {
      if (category.name === catName) {
        return category;
      }
    }
    throw 'category not found!';
  }

  _filterOption(categories, options) {
    if (typeof options === 'string') {
      for (const category of categories) {
        if (category.name === options) {
          return category;
        }
      }
      return null;
    } else if (typeof options === 'number') {
      const ret_cat = [];
      for (const category of categories) {
        let addCategory = false;
        if (options & this.GET_OPTION.UNARCHIVED && !category.archived) {
          addCategory = true;
        }
        if (options & this.GET_OPTION.ARCHIVED && category.archived) {
          addCategory = true;
        }
        if (addCategory) ret_cat.push(category);
      }
      return ret_cat;
    }
  }

  async addCategory(catName, iter = 0) {
    if (!catName) {
      throw 'catName cannot be ""';
    }
    await this.ensureInit();
    const category = {
      name: iter === 0 ? catName : catName + '-' + iter,
      archived: false,
      archived_date: null,
    };
    for (const cat of this.categories) {
      if (cat.name === category.name) {
        if (iter < this.MAX_NAME_RESOLVE_ITER) {
          this.addCategory(catName, iter + 1);
        } else {
          throw 'Failed to make category name!';
        }
        return;
      }
    }
    this.categories.push(category);

    try {
      updateDoc(this.docRef, {
        categories: this.categories,
      });
      this._cat_dup.push(category);
      for (const id in this.listeners) {
        const listener = this.listeners[id];
        if (
          listener.event & this.EVENT.ADD &&
          (typeof listener.options === 'number' ||
            (typeof listener.options === 'string' &&
              category.name === listener.options))
        ) {
          try {
            listener.callback(this.EVENT.ADD, category);
          } catch (err) {
            console.error(err);
          }
        }
      }
    } catch (err) {
      console.error(err);
      this.categories = this._deepCopy(this._cat_dup);
    }
  }

  async _archiveCategory(catName, archive_status) {
    let category = null;
    let i = 0;
    for (i = 0; i < this.categories.length; i++) {
      category = this.categories[i];
      if (category.name === catName) {
        break;
      }
    }

    if (i === this.categories.length) {
      throw 'Category not found!';
    }
    if (category.archived === archive_status) {
      return;
    }

    category.date_archived = archive_status
      ? Timestamp.fromDate(new Date())
      : null;
    category.archived = archive_status;

    try {
      updateDoc(this.docRef, {
        categories: this.categories,
      });
      this._cat_dup[i].archived = archive_status;
      this._cat_dup[i].date_archived = category.date_archived;
      for (const id in this.listeners) {
        const listener = this.listeners[id];
        const categories = this._filterOption(
          this.categories,
          this.listeners[id].options,
        );
        if (listener.event & this.EVENT.ARCHIVE && categories != null) {
          try {
            listener.callback(
              this.archive_status ? this.EVENT.ARCHIVE : this.EVENT.UNARCHIVE,
              categories,
            );
          } catch (err) {
            console.error(err);
          }
        }
      }
    } catch (err) {
      console.error(err);
      this.categories = this._deepCopy(this._cat_dup);
    }
  }

  async archiveCategory(catName) {
    await this.ensureInit();
    await this._archiveCategory(catName, true);
  }

  async unarchiveCategory(catName) {
    await this.ensureInit();
    await this._archiveCategory(catName, false);
  }

  async removeCategory(catName) {
    let category = null;
    let i = 0;
    for (i = 0; i < this.categories.length; i++) {
      category = this.categories[i];
      if (category.name === catName) {
        break;
      }
    }

    if (i === this.categories.length) {
      throw 'Category not found!';
    }

    this.categories.splice(i, 1);
    try {
      await updateDoc(this.docRef, {
        categories: this.categories,
      });

      this._cat_dup.pop(i);
      for (const id in this.listeners) {
        const listener = this.listeners[id];
        const categories = this._filterOption(
          this.categories,
          this.listeners[id].options,
        );
        if (listener.event & this.EVENT.REMOVE && categories != null) {
          try {
            listener.callback(this.EVENT.REMOVE, categories);
          } catch (err) {
            console.error(err);
          }
        }
      }
    } catch (err) {
      console.error(err);
      this.categories = this._deepCopy(this._cat_dup);
    }
  }

  addListener(event, callback, options = this.GET_OPTION.ALL) {
    const listenerId = this.newListenerId;
    this.newListenerId++;

    this.listeners[listenerId] = {
      event: event,
      options: options,
      callback: callback,
    };

    return () => {
      this._removeListener(listenerId);
    };
  }

  _removeListener(id) {
    delete this.listeners[id];
  }
}
