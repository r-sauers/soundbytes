import Component from '@glimmer/component';
import { action } from '@ember/object';

export default class popup extends Component {
    @action unpop() {
        this.args.unpop();
    }
}