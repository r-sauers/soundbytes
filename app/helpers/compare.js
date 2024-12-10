import { helper } from '@ember/component/helper';

export default helper(function compare(positional /*, named*/) {
  switch (positional[1]) {
    case '===':
    case '==':
      return positional[0] === positional[2];
    case '!==':
    case '!=':
      return positional[0] !== positional[2];
    case '>':
      return positional[0] > positional[2];
    case '>=':
      return positional[0] >= positional[2];
    case '<':
      return positional[0] < positional[2];
    case '<=':
      return positional[0] <= positional[2];
    default:
      return false;
  }
});
