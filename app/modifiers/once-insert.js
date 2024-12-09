import { modifier } from 'ember-modifier';

export default modifier(function onceInsert(element, positional /*, named*/) {
  positional[0]();
});
