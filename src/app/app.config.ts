import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners
} from '@angular/core';

import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import { provideRouter } from '@angular/router';

import {
  createInterceptorCondition,
  INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
  includeBearerTokenInterceptor,
  provideKeycloak
} from 'keycloak-angular';

import { routes } from './app.routes';
import { environment } from './environments/environment';

const urlCondition = createInterceptorCondition<{
  urlPattern: RegExp;
  bearerPrefix?: string;
}>({
  urlPattern: new RegExp(
    `^${environment.apiUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/.*`
  ),
  bearerPrefix: 'Bearer'
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(routes),

    provideHttpClient(
      withInterceptors([
        includeBearerTokenInterceptor
      ])
    ),

    {
      provide: INCLUDE_BEARER_TOKEN_INTERCEPTOR_CONFIG,
      useValue: [urlCondition]
    },

    provideKeycloak({
      config: {
        url: environment.keycloak.url,
        realm: environment.keycloak.realm,
        clientId: environment.keycloak.clientId
      },

      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false
      }
    })
  ]
};