import { subscribeToAuthState, type AuthUser } from '$lib/firebase/auth';
import { browser } from '$app/environment';

class AuthStore {
  user = $state<AuthUser | null>(null);
  loading = $state(true);
  
  constructor() {
    if (browser) {
      subscribeToAuthState((user) => {
        this.user = user;
        this.loading = false;
      });
    }
  }
  
  get isAuthenticated() {
    return !!this.user;
  }
}

export const authStore = new AuthStore();