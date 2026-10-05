import { Injectable, inject } from '@angular/core';
import Keycloak from 'keycloak-js';


@Injectable({
  providedIn: 'root'
})
export class KeycloakService {

  private keycloak = inject(Keycloak);

  login(): void {
    this.keycloak.login();
  }

  logout(): void {
    this.keycloak.logout({
      redirectUri: window.location.origin
    });
  }

  isLoggedIn(): boolean {
    return this.keycloak.authenticated ?? false;
  }

  getUsername(): string {
    return this.keycloak.tokenParsed?.['preferred_username'] ?? '';
  }

  getToken(): string | undefined {
    return this.keycloak.token;
  }
}