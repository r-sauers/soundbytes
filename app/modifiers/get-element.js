import { modifier } from 'ember-modifier';

export default modifier(function getElement(element, positional /*, named*/) {
  positional[0](element);
});
