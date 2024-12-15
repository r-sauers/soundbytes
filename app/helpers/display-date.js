import { helper } from '@ember/component/helper';
import { Timestamp } from 'firebase/firestore';

export default helper(function displayDate(positional /*, named*/) {
  let date = null;
  if (typeof positional[0] === 'object') {
    date = positional[0].toDate();
  } else {
    date = new Date(positional[0]);
  }
  var display_date = '';
  display_date =
    date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();
  return display_date;
});
