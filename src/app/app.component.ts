import { Component, OnInit } from '@angular/core';
import * as BigIntAlt from 'big-integer';
import * as BigDecimal from 'decimal.js';
import * as JSONZ from 'json-z';
import { ExtendedTypeMode, JsonZOptions, Quote } from 'json-z';
import { clone, isEqual } from 'lodash';

import { InputOptions, PreferencesService, ReparseOptions } from './preferences.service';
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

const theWorksPlus = Object.assign(clone(theWorks), { revealHiddenArrayProperties: true});

@Component({
  selector: 'jz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private lastErrorTimer: any;
  private newErrorTime = 0;
  private lastReparseErrorTimer: any;
  private newReparseErrorTime = 0;
  private sourceValue: any;
  private reparsedValue: any;
  private _detailsCollapsed = false;

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

  inputOptions = [
    { label: 'JavaScript or JSON', value: InputOptions.AS_JAVASCRIPT },
    { label: 'JSON-Z', value: InputOptions.AS_JSONZ }
  ];

  reparseOptions = [
    { label: 'using JSON', value: ReparseOptions.AS_JSON },
    { label: 'using JSONP', value: ReparseOptions.AS_JSONP },
    { label: 'using assisted JSONP', value: ReparseOptions.AS_JSONP_ASSISTED }
  ];

  currentOptions: JsonZOptions = Object.assign({}, theWorks);
  inputOption = InputOptions.AS_JAVASCRIPT;
  output = '';
  outputError = false;
  reparsed = '';
  reparsedError = false;
  reparseOption = ReparseOptions.AS_JSON;
  showJsonZOutput = true;
  source = '';
  space = '2';

  get detailsCollapsed(): boolean { return this._detailsCollapsed; }
  set detailsCollapsed(newValue: boolean) {
    if (this._detailsCollapsed !== newValue) {
      this._detailsCollapsed = newValue;
      this.updatePrefs();
    }
  }

  // noinspection JSMethodCanBeStatic
  get hasNativeBigInt(): boolean { return JSONZ.hasNativeBigInt(); }

  constructor(private prefsService: PreferencesService) {
    const prefs = prefsService.get();

    if (prefs) {
      this._detailsCollapsed = !!prefs.detailsCollapsed;
      this.inputOption = prefs.inputOption || InputOptions.AS_JAVASCRIPT;
      this.currentOptions = prefs.options || this.currentOptions;
      this.reparseOption = prefs.reparseOption || ReparseOptions.AS_JSON,
      this.source = prefs.source || '';
      this.space = String(prefs.space || 0);

      this.showJsonZOutput = this.inputOption === InputOptions.AS_JAVASCRIPT;

      if (this.reparseOption === ReparseOptions.AS_JSONP_ASSISTED)
        JSONZ.globalizeTypeHandlers(this.currentOptions.typePrefix);
    }
  }

  ngOnInit(): void {
    this.onParsingChange(false);
  }

  onInputOptionChange(): void {
    const showJsonZ = this.inputOption === InputOptions.AS_JAVASCRIPT;

    if (this.showJsonZOutput !== showJsonZ) {
      this.showJsonZOutput = showJsonZ;

      if (showJsonZ) {
        this.source = this.output = this.reparsed = '';
        this.outputError = this.reparsedError = false;
      }
      else
        this.source = this.output;
    }

    this.onChange(false, true);
  }

  onParsingChange(updateThePrefs = true): void {
    if (this.reparseOption === ReparseOptions.AS_JSONP_ASSISTED)
      JSONZ.globalizeTypeHandlers(this.currentOptions.typePrefix);
    else
      JSONZ.removeGlobalizedTypeHandlers();

    this.onChange(false, updateThePrefs);
  }

  onChange(delayError = false, updateThePrefs = true): void {
    if (updateThePrefs)
      this.updatePrefs();

    if (this.lastErrorTimer) {
      clearTimeout(this.lastErrorTimer);
      this.lastErrorTimer = undefined;

      if (performance.now() > this.newErrorTime + ERROR_DELAY) {
        this.output = this.reparsed = '';
        this.outputError = this.reparsedError = false;
      }
    }

    if (this.showJsonZOutput) {
      try {
        this.sourceValue = saferEval(this.source);
        this.output = this.sourceValue === NOTHIN_NADA_ZIP ? '' : JSONZ.stringify(this.sourceValue, this.currentOptions, this.getSpace());
        this.outputError = false;
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
          this.outputError = true;
          this.reparsed = '';
        }, delayError ? ERROR_DELAY : 0);
      }
    }
    else {
      this.output = this.source;
      this.outputError = false;
      this.newErrorTime = 0;
      this.reparse(delayError);
    }
  }

  private reparse(delayError = false): void {
    const asJSON = this.reparseOption === ReparseOptions.AS_JSON;

    if (this.lastReparseErrorTimer) {
      clearTimeout(this.lastReparseErrorTimer);
      this.lastReparseErrorTimer = undefined;

      if (performance.now() > this.newReparseErrorTime + ERROR_DELAY) {
        this.reparsed = '';
        this.reparsedError = false;
      }
    }

    if (this.sourceValue === NOTHIN_NADA_ZIP) {
      this.reparsed = '';
      this.reparsedError = false;

      return;
    }

    try {
      if (asJSON)
        this.reparsedValue = JSON.parse(this.output);
      else
        this.reparsedValue = saferEval(this.output);

      this.reparsed = JSONZ.stringify(this.reparsedValue, theWorksPlus, this.getSpace());
      this.reparsedError = false;
    }
    catch (err) {
      if (!this.newReparseErrorTime)
        this.newReparseErrorTime = performance.now();

      this.lastReparseErrorTimer = setTimeout(() => {
        this.lastReparseErrorTimer = undefined;
        this.newReparseErrorTime = 0;
        this.reparsed = `Cannot be reparsed ${asJSON ? 'as standard JSON' : 'using JSONP'}:\n\n` + err.toLocaleString();
        this.reparsedError = true;
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

  private getSpace(): string | number {
    const spaces = Math.round(parseFloat(this.space));

    return isNaN(spaces) ? this.space : spaces;
  }

  private updatePrefs(): void {
    const space = parseFloat(this.space);
    const prefs = {
      detailsCollapsed: this.detailsCollapsed,
      inputOption: this.inputOption,
      options: this.currentOptions,
      reparseOption: this.reparseOption,
      source: this.source,
      space: isNaN(space) ? this.space : space
    };

    this.prefsService.set(prefs);
  }
}
