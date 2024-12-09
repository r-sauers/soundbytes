import EmberRouter from '@ember/routing/router';
import config from 'ember-quickstart/config/environment';

export default class Router extends EmberRouter {
  location = config.locationType;
  rootURL = config.rootURL;
}

Router.map(function () {
  this.route('sounds');
  this.route('sounds_by_id', { path: '/sounds/:sound_id' });
  this.route('archived');
  this.route('404', { path: '/*path' });

  this.route('splash', {
    path: '/',
  });
  this.route('sounds_by_cat', { path: '/sounds/:cat' });
});
