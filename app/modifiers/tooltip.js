import { modifier } from 'ember-modifier';

export default modifier(function tooltip(element , positional/*, named*/) {
  positional[0].setTooltip(new bootstrap.Tooltip(element));
});
