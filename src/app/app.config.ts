import {
  ApplicationConfig,
  provideZoneChangeDetection,
  importProvidersFrom,
  isDevMode
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { ToastrModule } from 'ngx-toastr';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { AuthInterceptor } from './auth.interceptor';
// import { provideS3Initializer } from './services/s3-buckets/s3-initializer';
import { routes } from './app.routes';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { provideNativeDateAdapter } from '@angular/material/core';
export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideCharts(withDefaultRegisterables()),
        importProvidersFrom(HttpClientModule),
    importProvidersFrom(ToastrModule.forRoot()),
    provideAnimations(),
    // provideS3Initializer(),
    provideNativeDateAdapter(),
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000'
    })
  ]
};
