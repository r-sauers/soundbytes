import Component from '@glimmer/component';

export default class Tooltip extends Component {
  tooltip = null;
  setTooltip(tooltip) {
    this.tooltip = tooltip;
  }
  willDestroy() {
    super.willDestroy();
    if (this.tooltip) {
      this.tooltip.dispose();
    }
  }
}
