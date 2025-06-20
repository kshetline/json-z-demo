import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Decimal as BigDecimal } from 'decimal.js';
import JSON5 from 'json5';
import JSONZ, { ExtendedTypeMode, JsonZOptions, Quote } from 'json-z';
import { MenuItem } from 'primeng/api';
import { InputOptions, PreferencesService, ReparseOptions } from './preferences.service';
import { NO_RESULT, saferEval } from './safer-eval';
import { Decimal } from 'proposal-decimal';
import {
  replacerSample2, replacerSample4, reviverSample2, sample1, sample2, sample3, sample4,
  sharedSample1, sharedSample3
} from './samples';
import { isEqual, isString, toInt } from '@tubular/util';
import { ShrinkWrapComponent } from './widgets/shrink-wrap/shrink-wrap.component';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { FieldsetModule } from 'primeng/fieldset';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { LabeledCheckboxComponent } from './widgets/labeled-checkbox/labeled-checkbox.component';
import { SelectModule } from 'primeng/select';

JSONZ.setBigDecimal(BigDecimal);
JSONZ.setDecimal(Decimal);

JSONZ.setOptions(JSONZ.OptionSet.THE_WORKS);

const ERROR_DELAY = 2000;

const compatibleOptions: JsonZOptions = {
  extendedPrimitives: false,
  extendedTypes: ExtendedTypeMode.OFF,
  maxIndent: '',
  oneLiners: '',
  primitiveBigDecimal: false,
  primitiveBigInt: false,
  primitiveDecimal: false,
  propertyFilter: [],
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
  maxIndent: '',
  oneLiners: '',
  primitiveBigDecimal: false,
  primitiveBigInt: true,
  primitiveDecimal: false,
  propertyFilter: [],
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
  maxIndent: '',
  oneLiners: 'stuff',
  primitiveBigDecimal: true,
  primitiveBigInt: true,
  primitiveDecimal: true,
  propertyFilter: [],
  quote: Quote.PREFER_SINGLE,
  quoteAllKeys: false,
  revealHiddenArrayProperties: false,
  space: 0,
  sparseArrays: true,
  trailingComma: true,
  typePrefix: '_',
};

const allPurposeCallback = '(key, value) => value';

let prefixRegex = /^(_|(_[_$a-z0-9]*_))$/i;

try {
  // Use smarter recognition of identifier characters, if available.
  const regex = /^(_|(_[_$\p{L}\p{Nd}\p{Mn}\p{Mc}\p{Pc}]*_))$/iu;

  if (regex.test('_å_'))
    prefixRegex = regex;
}
catch (err) {}

let spaceRegex = /^[\t\n\v\f\r \xA0\u2028\u2029\uFEFF]{0,10}$/;

try {
  // Use smarter recognition of identifier characters, if available.
  const regex = /^[\t\n\v\f\r \xA0\u2028\u2029\uFEFF\p{Zs}]{0,10}$/u;

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
  JSONZ,
  JSON5,
  UPPERCASE,
  ROUNDING,
  DELETING,
  HEXADECIMAL,
  NO_OCTAL
}

const inputInfoJavaScript =
`You can enter JSON below, or JavaScript code in one of the following forms:\
<ul>
  <li>A JavaScript value as a primitive, object, or array.</li>
  <li>JavaScript code ending with <code>return <i>variableName</i></code></li>
  <li>An IIFE returning the desired value.</li>
</ul>\
The functions <code>BigInt(<i>string</i>)</code>, <code>BigDecimal(<i>string</i>)</code>, \
and <code>Decimal(<i>string</i>)</code>
are available for making values compatible with assisted JSONP.`;

const inputInfoJsonz =
`You can enter JSON-Z below, taking full advantage of all JSON-Z features, \
not just the features selected for stringification above.

The functions <code>_BigInt(<i>string</i>)</code> and <code>_BigDecimal(<i>string</i>)</code> \
are available for making values compatible with assisted JSONP.`;

const replacerInfo =
`Enter a JavaScript code below for a replacer function.`;

const reviverInfo =
`Enter a JavaScript code below for a reviver function.`;

@Component({
  selector: 'jz-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [ButtonModule, DialogModule, FieldsetModule, FormsModule, InputTextModule, LabeledCheckboxComponent,
            MenuModule, SelectModule, ShrinkWrapComponent, TextareaModule, TooltipModule]
})
export class AppComponent implements OnDestroy, OnInit {
  readonly allPurposeCallback = allPurposeCallback;

  private _detailsCollapsed = false;
  private lastErrorTimer: any;
  private lastReparseErrorTimer: any;
  private _maxIndent: string | number = '';
  private _oneLiners = '';
  private _propertyFilter = '';
  private newErrorTime = 0;
  private newReparseErrorTime = 0;
  private pendingOutput: string;
  private pendingSourceValue: any;
  private reparsedValue: any;
  private replacerFn: any;
  private reviverFn: any;
  private sourceValue: any;
  private _space: string | number = 2;
  private _typePrefix = '_';
  private needsMouseLeave: HTMLElement;

  private clickListener = (): void => {
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
    { label: 'JSON5', value: InputOptions.AS_JSON5 },
    { label: 'JSON-Z', value: InputOptions.AS_JSONZ }
  ];

  reparseOptions = [
    { label: 'using JSON', value: ReparseOptions.AS_JSON },
    { label: 'using JSON5', value: ReparseOptions.AS_JSON5 },
    { label: 'using JSONP', value: ReparseOptions.AS_JSONP },
    { label: 'using assisted JSONP', value: ReparseOptions.AS_JSONP_ASSISTED },
    { label: 'using JSON-Z', value: ReparseOptions.AS_JSONZ }
  ];

  sampleOptions: MenuItem[] = [
    { label: 'JavaScript sample', command: (): void => this.sampleSelected(SampleOptions.JAVASCRIPT) },
    { label: 'JSON5 sample', command: (): void => this.sampleSelected(SampleOptions.JSON5) },
    { label: 'JSON-Z for JSONP sample', command: (): void => this.sampleSelected(SampleOptions.JSONZ_JSONP) },
    { label: 'JSON-Z sample', command: (): void => this.sampleSelected(SampleOptions.JSONZ) }
  ];

  replacerSampleOptions: MenuItem[] = [
    { label: 'Strings to uppercase', command: (): void => this.sampleSelected(SampleOptions.UPPERCASE) },
    { label: 'Rounding numbers', command: (): void => this.sampleSelected(SampleOptions.ROUNDING) },
    { label: 'Deleting values', command: (): void => this.sampleSelected(SampleOptions.DELETING) },
    { label: 'Integers as hexadecimal', command: (): void => this.sampleSelected(SampleOptions.HEXADECIMAL) }
  ];

  reviverSampleOptions: MenuItem[] = [
    { label: 'Strings to uppercase', command: (): void => this.sampleSelected(SampleOptions.UPPERCASE, true) },
    { label: 'Disable implied octal', command: (): void => this.sampleSelected(SampleOptions.NO_OCTAL, true) },
    { label: 'Deleting values', command: (): void => this.sampleSelected(SampleOptions.DELETING, true) }
  ];

  banner: SafeHtml;
  currentOptions: JsonZOptions = Object.assign({}, theWorks);
  displayedFormat = 'JSON-Z';
  reviveTypedContainers = true;
  inputInfo = inputInfoJavaScript;
  inputOption = InputOptions.AS_JAVASCRIPT;
  maxIndentError = false;
  output = '';
  outputError = false;
  replacer = allPurposeCallback;
  replacerInfo = replacerInfo;
  reparsed = '';
  reparsedAsJSON = '';
  reparsedError = false;
  reparseOption = ReparseOptions.AS_JSON;
  reviver = allPurposeCallback;
  reviverInfo = reviverInfo;
  showInputInfo = false;
  showJsonZOutput = true;
  showReplacerInfo = false;
  showReviverInfo = false;
  source = '';
  spaceError = false;
  typePrefixError = false;
  useReplacer = false;
  useReviver = false;

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
        const space = toInt(newValue);

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

  get maxIndent(): string | number { return this._maxIndent; }
  set maxIndent(newValue: string | number) {
    newValue = String(newValue);

    if (this._maxIndent !== newValue) {
      if (newValue?.trim() === '' || /^\s*\d\d?\s*/.test(newValue)) {
        const maxIndent = toInt(newValue) || '';

        if (maxIndent && maxIndent < 0)
          this.maxIndentError = true;
        else {
          this._maxIndent = maxIndent;
          this.maxIndentError = false;
          this.currentOptions.maxIndent = maxIndent;
        }
      }
      else {
        this.maxIndentError = true;
      }
    }
    else if (this._maxIndent === newValue)
      this.maxIndentError = false;
  }

  get oneLiners(): string { return this._oneLiners; }
  set oneLiners(newValue: string) {
    if (this._oneLiners !== newValue) {
      this._oneLiners = newValue;
      this.currentOptions.oneLiners = newValue;
    }
  }

  get propertyFilter(): string { return this._propertyFilter; }
  set propertyFilter(newValue: string) {
    if (this._propertyFilter !== newValue) {
      this._propertyFilter = newValue;
      this.currentOptions.propertyFilter = (newValue || '').split(',').map(s => s.trim()).filter(s => !!s);
    }
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

  constructor(
    http: HttpClient,
    private prefsService: PreferencesService,
    sanitizer: DomSanitizer
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
      this.replacer = prefs.replacer ?? '';
      this.useReplacer = !!prefs.replacerOn;
      this.reviver = prefs.reviver ?? '';
      this.useReviver = !!prefs.reviverOn;
      this.reviveTypedContainers = prefs.reviveTypedContainers ?? this.reviveTypedContainers;
      this.source = prefs.source || '';
      this.space = prefs.space || 0;
      this.maxIndent = this.currentOptions.maxIndent;
      this.oneLiners = (this.currentOptions.oneLiners || '') as string;
      this.propertyFilter = (this.currentOptions.propertyFilter || []).join(', ');
      this.typePrefix = this.currentOptions.typePrefix;
      // Get back the defaults if the prefs values turned out to be invalid
      this.currentOptions.maxIndent = this.maxIndent as (number | '');
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

  sampleSelected(sampleOption: SampleOptions, forReviver = false): void {
    switch (sampleOption) {
      case SampleOptions.JAVASCRIPT:
        this.inputOption = InputOptions.AS_JAVASCRIPT;
        this.reparseOption = ReparseOptions.AS_JSON;
        this.onInputOptionChange(sample1);
        this.onParsingChange(false);
        this.setCompatible();
        break;

      case SampleOptions.JSON5:
        this.inputOption = InputOptions.AS_JSON5;
        this.reparseOption = ReparseOptions.AS_JSON5;
        this.onInputOptionChange(sample4);
        this.onParsingChange(false);
        this.setTheWorks();
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

      case SampleOptions.UPPERCASE:
        if (forReviver)
          this.reviver = sharedSample1;
        else
          this.replacer = sharedSample1;

        this.onChange(false);
        break;

      case SampleOptions.ROUNDING:
        this.replacer = replacerSample2;
        this.onChange(false);
        break;

      case SampleOptions.NO_OCTAL:
        this.reviver = reviverSample2;
        this.onChange(false);
        break;

      case SampleOptions.DELETING:
        if (forReviver)
          this.reviver = sharedSample3;
        else
          this.replacer = sharedSample3;

        this.onChange(false);
        break;

      case SampleOptions.HEXADECIMAL:
        this.replacer = replacerSample4;
        this.onChange(false);
        break;
    }
  }

  touchInput = (): any => this.showInputInfo = true;
  touchReplacer = (): any => this.showReplacerInfo = true;
  touchReviver = (): any => this.showReviverInfo = true;

  touchToHover(event: TouchEvent, callback: () => any): void {
    event.preventDefault();

    if (screenTooSmallForTooltip())
      callback();
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

  clearReplacer(): void {
    this.replacer = allPurposeCallback;
    this.onChange();
  }

  clearReviver(): void {
    this.reviver = allPurposeCallback;
    this.onChange();
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

    this.pendingOutput = '';
    this.pendingSourceValue = undefined;
    this.currentOptions.replacer = undefined;

    const err = this.validateReplacer() || this.validateReviver() || this.validateInput();

    if (!err) {
      this.output = this.pendingOutput;
      this.sourceValue = this.pendingSourceValue;
      this.reparse(delayError);
    }
    else {
      if (!this.newErrorTime)
        this.newErrorTime = performance.now();

      this.lastErrorTimer = setTimeout(() => {
        this.lastErrorTimer = undefined;
        this.newErrorTime = 0;
        this.sourceValue = err;

        if (this.showJsonZOutput) {
          this.output = err.toLocaleString();
          this.outputError = true;
          this.reparsed = '';
        }
        else {
          this.reparsed = err.toLocaleString();
          this.reparsedError = true;
        }
      }, delayError ? ERROR_DELAY : 0);
    }
  }

  private validateReplacer(): any {
    let error: any;

    if (this.useReplacer && this.replacer.trim()) {
      try {
        this.replacerFn = saferEval(this.replacer);

        if (this.replacerFn && (typeof this.replacerFn !== 'function' || this.replacerFn.length < 2))
          error = Error('The specified replacer is not a function with at least two arguments.');
      }
      catch (err) {
        this.replacerFn = undefined;
        error = err;
      }
    }
    else
      this.replacerFn = undefined;

    return error;
  }

  private validateReviver(): any {
    let error: any;

    if (this.useReviver && this.reviver.trim() && !this.isJsonP()) {
      try {
        this.reviverFn = saferEval(this.reviver);

        if (this.reviverFn && (typeof this.reviverFn !== 'function' || this.reviverFn.length < 2))
          error = new Error('The specified reviver is not a function with at least two arguments.');
      }
      catch (err) {
        this.reviverFn = undefined;
        error = err;
      }
    }
    else
      this.reviverFn = undefined;

    return error;
  }

  private validateInput(): any {
    if (this.showJsonZOutput) {
      try {
        this.pendingSourceValue = saferEval(this.source);
        this.pendingOutput = this.pendingSourceValue === NO_RESULT ? '' :
          JSONZ.stringify(this.pendingSourceValue, this.currentOptions, this.space);
        this.outputError = false;
        this.newErrorTime = 0;

        return null;
      }
      catch (err) {
        return err;
      }
    }
    else {
      this.pendingSourceValue = (!this.source || this.source.trim() === '' ? NO_RESULT : this.source);
      this.pendingOutput = this.source;
      this.outputError = false;
      this.newErrorTime = 0;
    }

    return null;
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
        this.reparsedValue = JSON.parse(this.output, this.reviverFn);
      }
      else if (this.reparseOption === ReparseOptions.AS_JSONZ) {
        reparsedAs = 'using JSON-Z';
        this.reparsedValue = JSONZ.parse(this.output, {
          reviver: this.reviverFn,
          reviveTypedContainers: this.reviveTypedContainers
        });
      }
      else if (this.reparseOption === ReparseOptions.AS_JSON5) {
        reparsedAs = 'using JSON5';
        this.reparsedValue = JSON5.parse(this.output, this.reviverFn);
      }
      else {
        reparsedAs = 'using JSONP';
        this.reparsedValue = saferEval(this.output);
      }

      if (this.reparseOption === ReparseOptions.AS_JSON5) {
        const q = this.currentOptions.quote;
        const quote = isString(q) ? q.toString() :
          (q === Quote.DOUBLE || q === Quote.PREFER_DOUBLE) ? '"' : "'";

        if (!this.useReplacer && this.currentOptions.propertyFilter?.length > 0)
          this.reparsed = JSON5.stringify(this.reparsedValue, this.currentOptions.propertyFilter as any, this.space);
        else {
          this.reparsed = JSON5.stringify(this.reparsedValue, {
            space: this.space,
            quote,
            replacer: this.replacerFn
          });
        }

        this.displayedFormat = 'JSON5';
      }
      else {
        this.currentOptions.replacer = this.replacerFn;
        this.reparsed = JSONZ.stringify(this.reparsedValue, this.currentOptions, this.space);
        this.displayedFormat = 'JSON-Z';
      }

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
    return isEqual(this.currentOptions, compatibleOptions, { keysToIgnore: ['replacer'] }) &&
           !this.reviveTypedContainers;
  }

  isRelaxed(): boolean {
    return isEqual(this.currentOptions, relaxedOptions, { keysToIgnore: ['replacer'] }) &&
           this.reviveTypedContainers;
  }

  isTheWorks(): boolean {
    return isEqual(this.currentOptions, theWorks, { keysToIgnore: ['replacer'] }) &&
           this.reviveTypedContainers;
  }

  setCompatible(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, compatibleOptions);
    this.reviveTypedContainers = false;
    this.oneLiners = '';
    this.typePrefix = '_';
    this.onChange();
  }

  setRelaxed(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, relaxedOptions);
    this.reviveTypedContainers = true;
    this.oneLiners = '';
    this.typePrefix = '_';
    this.onChange();
  }

  setTheWorks(): void {
    this.currentOptions = {};
    Object.assign(this.currentOptions, theWorks);
    this.reviveTypedContainers = true;
    this.oneLiners = this.currentOptions.oneLiners as string;
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

  isJson5(): boolean {
    return this.reparseOption === ReparseOptions.AS_JSON5;
  }

  isJsonP(): boolean {
    return this.reparseOption === ReparseOptions.AS_JSONP || this.reparseOption === ReparseOptions.AS_JSONP_ASSISTED;
  }

  private updatePrefs(): void {
    const prefs = {
      detailsCollapsed: this.detailsCollapsed,
      inputOption: this.inputOption,
      maxIndent: this.maxIndent,
      oneLiners: this.oneLiners.trim(),
      options: this.currentOptions,
      propertyFilter: (this.propertyFilter || '').split(',').map(s => s.trim()).filter(s => !!s),
      replacer: this.replacer,
      replacerOn: this.useReplacer,
      reviver: this.reviver,
      reviverOn: this.useReviver,
      reviveTypedContainers: this.reviveTypedContainers,
      reparseOption: this.reparseOption,
      source: this.source,
      space: this.space
    };

    this.prefsService.set(prefs);
  }
}
