import { helper } from '@ember/component/helper';

export default helper(function displayDate(positional /*, named*/) {
  const date = new Date(positional[0]);
  var display_date = '';
  display_date =
    date.getMonth() + 1 + '/' + date.getDate() + '/' + date.getFullYear();
  return display_date;
});
