import { modifier } from 'ember-modifier';

export default modifier(function autofocus(element /*, positional, named*/) {
  element.focus();
});
