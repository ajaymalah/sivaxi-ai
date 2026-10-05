import { createAuthGuard, AuthGuardData } from 'keycloak-angular';

export const authGuard = createAuthGuard(
  async (_route, state, authData: AuthGuardData) => {

    if (authData.authenticated) {
      return true;
    }

    await authData.keycloak.login({
      redirectUri: window.location.origin + state.url
    });

    return false;
  }
);