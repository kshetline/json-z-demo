import { Injectable } from '@angular/core';
import * as JSONZ from 'json-z';
import { JsonZOptions } from 'json-z';
import { cloneDeep, debounce } from 'lodash';

export interface Preferences {
  detailsCollapsed?: boolean;
  options?: JsonZOptions;
  source?: string;
  space?: string | number;
}

@Injectable()
export class PreferencesService {
  private prefs: Preferences;
  private debouncedSaveSettings = debounce(() =>
      localStorage.setItem('prefs', JSONZ.stringify(this.prefs, JSONZ.OptionSet.THE_WORKS)), 2000);

  constructor() {
    const prefsStr = localStorage.getItem('prefs');

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
