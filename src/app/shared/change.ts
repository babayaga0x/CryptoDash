import { Component, computed, input } from '@angular/core';
import { PctPipe } from './format';

/** Percent change: green, red, or grey when there is no data. */
@Component({
  selector: 'app-change',
  imports: [PctPipe],
  template: `<span [class]="'chg ' + tone()">{{ value() | pct }}</span>`,
})
export class Change {
  readonly value = input<number | null | undefined>();

  protected readonly tone = computed(() => {
    const v = this.value();
    return v == null ? 'na' : v >= 0 ? 'up' : 'down';
  });
}
