import { Component } from '@angular/core';
import * as BigIntAlt from 'big-integer';
import * as BigDecimal from 'decimal.js';
import * as JSONZ from 'json-z';

import { NOTHIN_NADA_ZIP, saferEval } from './safer-eval';

JSONZ.setBigDecimal(BigDecimal);

if (!JSONZ.hasBigInt())
  JSONZ.setBigInt(BigIntAlt);

JSONZ.setOptions(JSONZ.OptionSet.THE_WORKS);

const ERROR_DELAY = 2000;

@Component({
  selector: 'jz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private lastErrorTimer: any;
  private newErrorTime = 0;

  source = '';
  output = '';

  constructor() { }

  onChange(): void {
    if (this.lastErrorTimer) {
      clearTimeout(this.lastErrorTimer);
      this.lastErrorTimer = undefined;

      if (performance.now() > this.newErrorTime + ERROR_DELAY)
        this.output = '';
    }

    try {
      const result = saferEval(this.source);

      this.output = result === NOTHIN_NADA_ZIP ? '' : JSONZ.stringify(result, null, 2);
      this.newErrorTime = 0;
    }
    catch (err) {
      if (!this.newErrorTime)
        this.newErrorTime = performance.now();

      this.lastErrorTimer = setTimeout(() => {
        this.lastErrorTimer = undefined;
        this.newErrorTime = 0;
        this.output = err.toLocaleString();
      }, ERROR_DELAY);
    }
  }
}
