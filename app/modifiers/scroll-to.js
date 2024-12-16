import { modifier } from 'ember-modifier';

export default modifier(function scrollTo(element /*, positional, named*/) {
  element.scrollIntoView({ block: 'center' });
});
