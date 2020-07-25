import { Injectable } from '@angular/core';
import * as JSONZ from 'json-z';
import { JsonZOptions } from 'json-z';
import { cloneDeep, debounce } from 'lodash';

export enum InputOptions {
  AS_JAVASCRIPT,
  AS_JSONZ
}

export enum ReparseOptions {
  AS_JSON,
  AS_JSONP,
  AS_JSONP_ASSISTED,
  AS_JSONZ
}

export interface Preferences {
  detailsCollapsed?: boolean;
  inputOption?: InputOptions;
  options?: JsonZOptions;
  reparseOption?: ReparseOptions;
  reviveTypedContainers?: boolean;
  source?: string;
  space?: string | number;
}

@Injectable()
export class PreferencesService {
  private prefs: Preferences;
  private debouncedSaveSettings = debounce(() =>
      localStorage.setItem('jsonz-prefs', JSONZ.stringify(this.prefs, JSONZ.OptionSet.THE_WORKS)), 2000);

  constructor() {
    const prefsStr = localStorage.getItem('jsonz-prefs');

    if (prefsStr) {
      try {
        this.prefs = JSONZ.parse(prefsStr);

        if (!this.prefs || (typeof this.prefs !== 'object'))
          this.prefs = undefined;
      }
      catch (err) {}
    }
  }

  get(): Preferences {
    return this.prefs && cloneDeep(this.prefs);
  }

  set(newPrefs: Preferences): void {
    this.prefs = newPrefs && cloneDeep(newPrefs);
    this.debouncedSaveSettings();
  }
}
