import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as BigIntAlt from 'big-integer';
import * as BigDecimal from 'decimal.js';
import * as JSONZ from 'json-z';
import { ExtendedTypeMode, JsonZOptions, Quote } from 'json-z';
import { isEqual } from 'lodash';
import { MenuItem } from 'primeng/api';

import { InputOptions, PreferencesService, ReparseOptions } from './preferences.service';
import { FixedBigDecimal, NO_RESULT, saferEval } from './safer-eval';
import { sample1, sample2, sample3 } from './samples';

JSONZ.setBigDecimal(BigDecimal);
JSONZ.setFixedBigDecimal(FixedBigDecimal);

if (!JSONZ.hasBigInt())
  JSONZ.setBigInt(BigIntAlt);

JSONZ.setOptions(JSONZ.OptionSet.THE_WORKS);

const ERROR_DELAY = 2000;

const compatibleOptions: JsonZOptions = {
  extendedPrimitives: false,
  extendedTypes: ExtendedTypeMode.OFF,
  primitiveBigDecimal: false,
  primitiveBigInt: false,
  primitiveFixedBigDecimal: false,
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
  primitiveFixedBigDecimal: false,
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
  primitiveFixedBigDecimal: true,
  quote: Quote.PREFER_SINGLE,
  quoteAllKeys: false,
  revealHiddenArrayProperties: false,
  space: 0,
  sparseArrays: true,
  trailingComma: true,
  typePrefix: '_',
};

let prefixRegex = /^(_|(_[_$a-z0-9]*_))$/i;

try {
  // Use smarter recognition of identifier characters, if available.
  const regex = new RegExp('^(_|(_[_$\\p{L}\\p{Nd}\\p{Mn}\\p{Mc}\\p{Pc}]*_))$', 'iu');

  if (regex.test('_å_'))
    prefixRegex = regex;
}
catch (err) {}

let spaceRegex = /^[\t\n\v\f\r \xA0\u2028\u2029\uFEFF]{0,10}$/;

try {
  // Use smarter recognition of identifier characters, if available.
  const regex = new RegExp('^[\\t\\n\\v\\f\\r \\xA0\\u2028\\u2029\\uFEFF\\p{Zs}]{0,10}$', 'u');

  if (regex.test('\u2029'))
    spaceRegex = regex;
}
catch (err) {}

function isValidTypePrefix(prefix: string): boolean {
  return prefixRegex.test(prefix);
}

function screenTooSmallForTooltip(): boolean {
  return window.innerWidth < 480 || window.innerHeight < 480;
}

enum SampleOptions {
  JAVASCRIPT,
  JSONZ_JSONP,
  JSONZ
}

const inputInfoJavaScript =
`You can enter JSON below, or JavaScript code in one of the following forms:\
<ul>
  <li>A JavaScript value as a primitive, object, or array.</li>
  <li>JavaScript code ending with <code>return <i>variableName</i></code></li>
  <li>An IIFE returning the desired value.</li>
</ul>\
The functions <code>BigInt(<i>string</i>)</code> and <code>BigDecimal(<i>string</i>)</code> \
are available for making values compatible with assisted JSONP.`;

const inputInfoJsonz =
`You can enter JSON-Z below, taking full advantage of all JSON-Z features, \
not just the features selected for stringification above.

The functions <code>_BigInt(<i>string</i>)</code> and <code>_BigDecimal(<i>string</i>)</code> \
are available for making values compatible with assisted JSONP.`;

@Component({
  selector: 'jz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy, OnInit {
  private _detailsCollapsed = false;
  private lastErrorTimer: any;
  private lastReparseErrorTimer: any;
  private newErrorTime = 0;
  private newReparseErrorTime = 0;
  private reparsedValue: any;
  private sourceValue: any;
  private _space: string | number = 2;
  private _typePrefix = '_';
  private needsMouseLeave: HTMLElement;

  private clickListener = () => {
    if (this.needsMouseLeave) {
      this.needsMouseLeave.dispatchEvent(new MouseEvent('mouseleave'));
      this.needsMouseLeave = undefined;
    }
  };

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
    { label: 'using assisted JSONP', value: ReparseOptions.AS_JSONP_ASSISTED },
    { label: 'using JSON-Z', value: ReparseOptions.AS_JSONZ }
  ];

  sampleOptions: MenuItem[] = [
    { label: 'JavaScript sample', command: () => this.sampleSelected(SampleOptions.JAVASCRIPT) },
    { label: 'JSON-Z for JSONP sample', command: () => this.sampleSelected(SampleOptions.JSONZ_JSONP) },
    { label: 'JSON-Z sample', command: () => this.sampleSelected(SampleOptions.JSONZ) }
  ];

  banner: SafeHtml;
  currentOptions: JsonZOptions = Object.assign({}, theWorks);
  reviveTypedContainers = true;
  inputInfo = inputInfoJavaScript;
  inputOption = InputOptions.AS_JAVASCRIPT;
  output = '';
  outputError = false;
  reparsed = '';
  reparsedAsJSON = '';
  reparsedError = false;
  reparseOption = ReparseOptions.AS_JSON;
  showInputInfo = false;
  showJsonZOutput = true;
  source = '';
  spaceError = false;
  typePrefixError = false;

  get detailsCollapsed(): boolean { return this._detailsCollapsed; }
  set detailsCollapsed(newValue: boolean) {
    if (this._detailsCollapsed !== newValue) {
      this._detailsCollapsed = newValue;
      this.updatePrefs();
    }
  }

  get space(): string | number { return this._space; }
  set space(newValue: string | number) {
    newValue = String(newValue);

    if (this._space !== newValue) {
      if (/^\s*\d\d?\s*/.test(newValue)) {
        const space = parseInt(newValue, 10);

        if (space > 10)
          this.spaceError = true;
        else {
          this._space = space;
          this.spaceError = false;
        }
      }
      else if (spaceRegex.test(newValue)) {
        this._space = newValue;
        this.spaceError = false;
      }
      else {
        this.spaceError = true;
      }
    }
    else if (this._space === newValue)
      this.spaceError = false;
  }

  get typePrefix(): string { return this._typePrefix; }
  set typePrefix(newValue: string) {
    if (this._typePrefix !== newValue) {
      if (isValidTypePrefix(newValue)) {
        this._typePrefix = newValue;
        this.typePrefixError = false;
        this.currentOptions.typePrefix = newValue;
      }
      else {
        this.typePrefixError = true;
      }
    }
    else if (this._typePrefix === newValue)
      this.typePrefixError = false;
  }

  // noinspection JSMethodCanBeStatic
  get hasNativeBigInt(): boolean { return JSONZ.hasNativeBigInt(); }

  constructor(
    private http: HttpClient,
    private prefsService: PreferencesService,
    private sanitizer: DomSanitizer,
  ) {
    http.get('assets/banner.html', { responseType: 'text' })
      .subscribe(content => this.banner = sanitizer.bypassSecurityTrustHtml(content.toString()));

    const prefs = prefsService.get();
    const startWithSample = !prefs || !prefs.source;

    if (prefs) {
      this._detailsCollapsed = !!prefs.detailsCollapsed;
      this.inputOption = prefs.inputOption ?? InputOptions.AS_JAVASCRIPT;
      this.inputInfo = (this.inputOption === InputOptions.AS_JAVASCRIPT ? inputInfoJavaScript : inputInfoJsonz);
      this.currentOptions = prefs.options || this.currentOptions;
      this.reparseOption = prefs.reparseOption ?? ReparseOptions.AS_JSON;
      this.reviveTypedContainers = prefs.reviveTypedContainers ?? this.reviveTypedContainers;
      this.source = prefs.source || '';
      this.space = prefs.space || 0;
      this.typePrefix = this.currentOptions.typePrefix;
      // Get back the default if the prefs value turned out to be invalid
      this.currentOptions.typePrefix = this.typePrefix;

      this.showJsonZOutput = this.inputOption === InputOptions.AS_JAVASCRIPT;

      if (this.reparseOption === ReparseOptions.AS_JSONP_ASSISTED || this.reparseOption === ReparseOptions.AS_JSONZ)
        JSONZ.globalizeTypeHandlers(this.currentOptions.typePrefix);
    }

    if (startWithSample)
      this.sampleSelected(SampleOptions.JAVASCRIPT);
  }

  ngOnInit(): void {
    this.onParsingChange(false);
    document.addEventListener('click', this.clickListener);
  }

  ngOnDestroy(): void {
    document.removeEventListener('click', this.clickListener);
  }

  sampleSelected(sampleOption: SampleOptions): void {
    switch (sampleOption) {
      case SampleOptions.JAVASCRIPT:
        this.inputOption = InputOptions.AS_JAVASCRIPT;
        this.reparseOption = ReparseOptions.AS_JSON;
        this.onInputOptionChange(sample1);
        this.onParsingChange(false);
        this.setCompatible();
        break;

      case SampleOptions.JSONZ_JSONP:
        this.inputOption = InputOptions.AS_JSONZ;
        this.reparseOption = ReparseOptions.AS_JSONP_ASSISTED;
        this.onInputOptionChange(sample2);
        this.onParsingChange(false);
        this.setTheWorks();
        break;

      case SampleOptions.JSONZ:
        this.inputOption = InputOptions.AS_JSONZ;
        this.reparseOption = ReparseOptions.AS_JSONZ;
        this.onInputOptionChange(sample3);
        this.onParsingChange(false);
        this.setTheWorks();
        break;
    }
  }

  touchToHover(event: TouchEvent): void {
    event.preventDefault();

    if (screenTooSmallForTooltip())
      this.showInputInfo = true;
    else if (this.needsMouseLeave) {
      this.needsMouseLeave.dispatchEvent(new MouseEvent('mouseleave'));
      this.needsMouseLeave = undefined;
    }
    else {
      this.needsMouseLeave = event.target as HTMLElement;
      this.needsMouseLeave.dispatchEvent(new MouseEvent('mouseenter'));
    }
  }

  onInputOptionChange(newSource?: string): void {
    const showJsonZ = this.inputOption === InputOptions.AS_JAVASCRIPT;

    if (this.showJsonZOutput !== showJsonZ || newSource) {
      this.showJsonZOutput = showJsonZ;

      if (showJsonZ) {
        this.inputInfo = inputInfoJavaScript;
        this.sourceValue = this.output = this.reparsed = '';
        this.source = newSource || this.reparsedAsJSON;
        this.reparsedAsJSON = '';
        this.outputError = this.reparsedError = false;
      }
      else {
        this.inputInfo = inputInfoJsonz;
        this.source = newSource || (this.outputError ? '' : this.output);
      }
    }

    if (!newSource)
      this.onChange(false, true);
  }

  onParsingChange(updateThePrefs = true): void {
    if (this.reparseOption === ReparseOptions.AS_JSONP_ASSISTED || this.reparseOption === ReparseOptions.AS_JSONZ)
      JSONZ.globalizeTypeHandlers(this.currentOptions.typePrefix);
    else
      JSONZ.removeGlobalizedTypeHandlers();

    this.onChange(false, updateThePrefs);
  }

  clearSource(): void {
    this.source = '';
    this.onChange();
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
        this.output = this.sourceValue === NO_RESULT ? '' : JSONZ.stringify(this.sourceValue, this.currentOptions, this.space);
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
          this.sourceValue = err;
          this.reparsed = '';
        }, delayError ? ERROR_DELAY : 0);
      }
    }
    else {
      this.sourceValue = (!this.source || this.source.trim() === '' ? NO_RESULT : this.source);
      this.output = this.source;
      this.outputError = false;
      this.newErrorTime = 0;
      this.reparse(delayError);
    }
  }

  private reparse(delayError = false): void {
    if (this.lastReparseErrorTimer) {
      clearTimeout(this.lastReparseErrorTimer);
      this.lastReparseErrorTimer = undefined;

      if (performance.now() > this.newReparseErrorTime + ERROR_DELAY) {
        this.reparsed = '';
        this.reparsedError = false;
      }
    }

    if (this.sourceValue === NO_RESULT) {
      this.reparsed = '';
      this.reparsedError = false;

      return;
    }

    let reparsedAs: string;

    try {
      if (this.reparseOption === ReparseOptions.AS_JSON) {
        reparsedAs = 'as standard JSON';
        this.reparsedValue = JSON.parse(this.output);
      }
      else if (this.reparseOption === ReparseOptions.AS_JSONZ) {
        reparsedAs = 'using JSONZ';
        this.reparsedValue = JSONZ.parse(this.output, { reviveTypedContainers: this.reviveTypedContainers });
      }
      else {
        reparsedAs = 'using JSONP';
        this.reparsedValue = saferEval(this.output);
      }

      this.reparsed = JSONZ.stringify(this.reparsedValue, this.currentOptions, this.space);
      this.reparsedError = false;

      try {
        this.reparsedAsJSON = JSON.stringify(this.reparsedValue, null, this.space);
      }
      catch (err) {
        this.reparsedAsJSON = '';
      }
    }
    catch (err) {
      this.reparsedAsJSON = '';

      if (!this.newReparseErrorTime)
        this.newReparseErrorTime = performance.now();

      this.lastReparseErrorTimer = setTimeout(() => {
        this.lastReparseErrorTimer = undefined;
        this.newReparseErrorTime = 0;
        this.reparsed = `Cannot be reparsed ${reparsedAs}:\n\n` + err.toLocaleString();
        this.reparsedError = true;
        this.reparsedValue = err;
      }, delayError ? ERROR_DELAY : 0);
    }
  }

  isCompatible(): boolean {
    return isEqual(this.currentOptions, compatibleOptions) && !this.reviveTypedContainers;
  }

  isRelaxed(): boolean {
    return isEqual(this.currentOptions, relaxedOptions) && this.reviveTypedContainers;
  }

  isTheWorks(): boolean {
    return isEqual(this.currentOptions, theWorks) && this.reviveTypedContainers;
  }

  setCompatible(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, compatibleOptions);
    this.reviveTypedContainers = false;
    this.typePrefix = '_';
    this.onChange();
  }

  setRelaxed(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, relaxedOptions);
    this.reviveTypedContainers = true;
    this.typePrefix = '_';
    this.onChange();
  }

  setTheWorks(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, theWorks);
    this.reviveTypedContainers = true;
    this.typePrefix = '_';
    this.onChange();
  }

  disableSourceLogging(): boolean {
    return !this.source || this.sourceValue === NO_RESULT;
  }

  logSource(): void {
    if (this.outputError)
      console.error(this.sourceValue);
    else
      console.log(this.sourceValue);
  }

  disableResultLogging(): boolean {
    return !this.reparsed || this.reparsedValue === NO_RESULT;
  }

  logResult(): void {
    if (this.outputError)
      console.error(this.reparsedValue);
    else
      console.log(this.reparsedValue);
  }

  private updatePrefs(): void {
    const prefs = {
      detailsCollapsed: this.detailsCollapsed,
      inputOption: this.inputOption,
      options: this.currentOptions,
      reviveTypedContainers: this.reviveTypedContainers,
      reparseOption: this.reparseOption,
      source: this.source,
      space: this.space
    };

    this.prefsService.set(prefs);
  }
}
