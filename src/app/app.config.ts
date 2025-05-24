import { ApplicationConfig } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { palette, definePreset } from '@primeng/themes';
import { provideHttpClient } from '@angular/common/http';

const AuraSky = definePreset(Aura, {
  semantic: {
    primary: palette('{sky}')
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    providePrimeNG({ theme: { preset: AuraSky } }),
    provideHttpClient()
  ]
};
