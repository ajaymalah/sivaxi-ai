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

const urlCondition = createInterceptorCondition<{
  urlPattern: RegExp;
  bearerPrefix?: string;
}>({
  urlPattern: /^http:\/\/localhost:8000\/.*/,
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
        url: 'https://auth.sivaxi.com',
        realm: 'ai',
        clientId: 'sivaxi-ai'
      },

      initOptions: {
        onLoad: 'check-sso',
        checkLoginIframe: false
      }
    })
  ]
};