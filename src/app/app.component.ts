import { Component } from '@angular/core';
import * as BigIntAlt from 'big-integer';
import * as BigDecimal from 'decimal.js';
import * as JSONZ from 'json-z';
import { ExtendedTypeMode, JsonZOptions, Quote } from 'json-z';
import { isEqual } from 'lodash';

import { NOTHIN_NADA_ZIP, saferEval } from './safer-eval';

JSONZ.setBigDecimal(BigDecimal);

if (!JSONZ.hasBigInt())
  JSONZ.setBigInt(BigIntAlt);

JSONZ.setOptions(JSONZ.OptionSet.THE_WORKS);

const ERROR_DELAY = 2000;

const compatibleOptions: JsonZOptions = {
  extendedPrimitives: false,
  extendedTypes: ExtendedTypeMode.OFF,
  primitiveBigDecimal: false,
  primitiveBigInt: false,
  quote: Quote.DOUBLE,
  quoteAllKeys: true,
  revealHiddenArrayProperties: false,
  space: 0,
  sparseArrays: false,
  trailingComma: false,
  typePrefix: '_',
};

const relaxedOptions: JsonZOptions = {
  extendedPrimitives: true,
  extendedTypes: ExtendedTypeMode.OFF,
  primitiveBigDecimal: false,
  primitiveBigInt: true,
  quote: Quote.PREFER_SINGLE,
  quoteAllKeys: false,
  revealHiddenArrayProperties: false,
  space: 0,
  sparseArrays: true,
  trailingComma: true,
  typePrefix: '_',
};

const theWorks: JsonZOptions = {
  extendedPrimitives: true,
  extendedTypes: ExtendedTypeMode.AS_FUNCTIONS,
  primitiveBigDecimal: true,
  primitiveBigInt: true,
  quote: Quote.PREFER_SINGLE,
  quoteAllKeys: false,
  revealHiddenArrayProperties: false,
  space: 0,
  sparseArrays: true,
  trailingComma: true,
  typePrefix: '_',
};

@Component({
  selector: 'jz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private lastErrorTimer: any;
  private newErrorTime = 0;
  private lastReparseErrorTimer: any;
  private newReparseErrorTime = 0;
  private sourceValue: any;
  private reparsedValue: any;

  extendedTypesOptions = [
    { label: 'OFF', value: ExtendedTypeMode.OFF },
    { label: 'AS_FUNCTIONS', value: ExtendedTypeMode.AS_FUNCTIONS },
    { label: 'AS_OBJECTS', value: ExtendedTypeMode.AS_OBJECTS }
  ];

  quoteOptions = [
    { label: 'DOUBLE', value: Quote.DOUBLE },
    { label: 'SINGLE', value: Quote.SINGLE },
    { label: 'PREFER_DOUBLE', value: Quote.PREFER_DOUBLE },
    { label: 'PREFER_SINGLE', value: Quote.PREFER_SINGLE }
  ];

  currentOptions: JsonZOptions = Object.assign({}, theWorks);
  source = '';
  output = '';
  reparsed = '';

  constructor() { }

  onChange(delayError = false): void {
    if (this.lastErrorTimer) {
      clearTimeout(this.lastErrorTimer);
      this.lastErrorTimer = undefined;

      if (performance.now() > this.newErrorTime + ERROR_DELAY)
        this.output = this.reparsed = '';
    }

    try {
      this.sourceValue = saferEval(this.source);
      this.output = this.sourceValue === NOTHIN_NADA_ZIP ? '' : JSONZ.stringify(this.sourceValue, this.currentOptions, 2);
      this.newErrorTime = 0;
      this.reparse(delayError);
    }
    catch (err) {
      if (!this.newErrorTime)
        this.newErrorTime = performance.now();

      this.lastErrorTimer = setTimeout(() => {
        this.lastErrorTimer = undefined;
        this.newErrorTime = 0;
        this.output = err.toLocaleString();
      }, delayError ? ERROR_DELAY : 0);
    }
  }

  private reparse(delayError = false): void {
    if (this.lastReparseErrorTimer) {
      clearTimeout(this.lastReparseErrorTimer);
      this.lastReparseErrorTimer = undefined;

      if (performance.now() > this.newReparseErrorTime + ERROR_DELAY)
        this.reparsed = '';
    }

    if (this.sourceValue === NOTHIN_NADA_ZIP) {
      this.reparsed = '';

      return;
    }

    try {
      this.reparsedValue = JSON.parse(this.output);
      this.reparsed = JSON.stringify(this.reparsedValue);
    }
    catch (err) {
      if (!this.newReparseErrorTime)
        this.newReparseErrorTime = performance.now();

      this.lastReparseErrorTimer = setTimeout(() => {
        this.lastReparseErrorTimer = undefined;
        this.newReparseErrorTime = 0;
        this.reparsed = 'Cannot be reparsed as standard JSON:\n\n' + err.toLocaleString();
      }, delayError ? ERROR_DELAY : 0);
    }
  }

  isCompatible(): boolean {
    return isEqual(this.currentOptions, compatibleOptions);
  }

  isRelaxed(): boolean {
    return isEqual(this.currentOptions, relaxedOptions);
  }

  isTheWorks(): boolean {
    return isEqual(this.currentOptions, theWorks);
  }

  setCompatible(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, compatibleOptions);
    this.onChange();
  }

  setRelaxed(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, relaxedOptions);
    this.onChange();
  }

  setTheWorks(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, theWorks);
    this.onChange();
  }
}
