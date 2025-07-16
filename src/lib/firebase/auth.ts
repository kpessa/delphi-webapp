import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  OAuthProvider,
  GoogleAuthProvider,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
  type UserCredential,
  type ActionCodeSettings
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth } from './config';
import { browser } from '$app/environment';

// Re-export auth for external use
export { auth };

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthError {
  code: string;
  message: string;
  userFriendlyMessage: string;
}

function getAuthErrorMessage(error: any): AuthError {
  const firebaseError = error as FirebaseError;
  let userFriendlyMessage = 'An unexpected error occurred. Please try again.';
  
  switch (firebaseError.code) {
    case 'auth/invalid-email':
      userFriendlyMessage = 'The email address is invalid.';
      break;
    case 'auth/user-disabled':
      userFriendlyMessage = 'This account has been disabled.';
      break;
    case 'auth/user-not-found':
      userFriendlyMessage = 'No account found with this email address.';
      break;
    case 'auth/wrong-password':
      userFriendlyMessage = 'Incorrect password.';
      break;
    case 'auth/invalid-credential':
      userFriendlyMessage = 'Invalid email or password.';
      break;
    case 'auth/email-already-in-use':
      userFriendlyMessage = 'An account already exists with this email address.';
      break;
    case 'auth/weak-password':
      userFriendlyMessage = 'Password should be at least 6 characters.';
      break;
    case 'auth/network-request-failed':
      userFriendlyMessage = 'Network error. Please check your internet connection.';
      break;
    case 'auth/too-many-requests':
      userFriendlyMessage = 'Too many failed attempts. Please try again later.';
      break;
    case 'auth/popup-blocked':
      userFriendlyMessage = 'Sign-in popup was blocked. Please allow popups for this site.';
      break;
    case 'auth/operation-not-allowed':
      userFriendlyMessage = 'This sign-in method is not enabled. Please contact support.';
      break;
    case 'auth/invalid-api-key':
      userFriendlyMessage = 'Configuration error. Please contact support.';
      break;
    case 'auth/app-deleted':
      userFriendlyMessage = 'Authentication service error. Please refresh the page.';
      break;
    case 'auth/invalid-action-code':
      userFriendlyMessage = 'The sign-in link is invalid or has expired. Please request a new one.';
      break;
    case 'auth/expired-action-code':
      userFriendlyMessage = 'The sign-in link has expired. Please request a new one.';
      break;
    case 'auth/invalid-email-link':
      userFriendlyMessage = 'Invalid sign-in link. Please request a new one.';
      break;
    case 'auth/invalid-continue-uri':
      userFriendlyMessage = 'Invalid configuration. Please contact support.';
      break;
    case 'auth/unauthorized-continue-uri':
      userFriendlyMessage = 'Unauthorized domain. Please contact support.';
      break;
    default:
      if (firebaseError.message) {
        console.error('Firebase Auth Error:', firebaseError.code, firebaseError.message);
      }
  }
  
  return {
    code: firebaseError.code || 'unknown',
    message: firebaseError.message || error.toString(),
    userFriendlyMessage
  };
}

export async function signUp(email: string, password: string): Promise<UserCredential> {
  if (!browser) throw new Error('Auth operations can only be performed in the browser');
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw getAuthErrorMessage(error);
  }
}

export async function signIn(email: string, password: string): Promise<UserCredential> {
  if (!browser) throw new Error('Auth operations can only be performed in the browser');
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw getAuthErrorMessage(error);
  }
}

export async function logOut(): Promise<void> {
  if (!browser) throw new Error('Auth operations can only be performed in the browser');
  return signOut(auth);
}

export function subscribeToAuthState(callback: (user: AuthUser | null) => void) {
  if (!browser) return () => {};
  
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      });
    } else {
      callback(null);
    }
  });
}

// Microsoft OAuth provider setup
const microsoftProvider = browser ? new OAuthProvider('microsoft.com') : null;

// Configure the provider with your tenant ID for single-tenant apps
// Use 'common' for multi-tenant access
if (microsoftProvider && browser) {
  microsoftProvider.setCustomParameters({
    tenant: import.meta.env.VITE_MICROSOFT_TENANT_ID || 'common',
    prompt: 'select_account'
  });
  // Request additional scopes if needed
  microsoftProvider.addScope('User.Read');
}

export async function signInWithMicrosoft(): Promise<UserCredential> {
  if (!browser) throw new Error('Auth operations can only be performed in the browser');
  if (!microsoftProvider) throw new Error('Microsoft provider not initialized');
  
  try {
    // Try popup first (better UX for desktop)
    return await signInWithPopup(auth, microsoftProvider);
  } catch (error: any) {
    // If popup blocked, fall back to redirect
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, microsoftProvider);
      // This will redirect the page, so no return value
      throw new Error('Redirecting to Microsoft sign-in...');
    }
    throw error;
  }
}

export async function handleRedirectResult(): Promise<UserCredential | null> {
  if (!browser) return null;
  
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error('Error handling redirect result:', error);
    throw error;
  }
}

// Magic Link Authentication
const STORAGE_KEY = 'emailForSignIn';

export async function sendMagicLink(email: string): Promise<void> {
  if (!browser) throw new Error('Auth operations can only be performed in the browser');
  
  const actionCodeSettings: ActionCodeSettings = {
    url: `${window.location.origin}/auth/finish-signin`,
    handleCodeInApp: true,
  };
  
  try {
    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    // Save email to localStorage to use when user returns
    window.localStorage.setItem(STORAGE_KEY, email);
  } catch (error) {
    throw getAuthErrorMessage(error);
  }
}

export function checkIfSignInWithLink(): boolean {
  if (!browser) return false;
  return isSignInWithEmailLink(auth, window.location.href);
}

export async function completeMagicLinkSignIn(email?: string): Promise<UserCredential> {
  if (!browser) throw new Error('Auth operations can only be performed in the browser');
  
  // Get email from parameter or localStorage
  let emailToUse = email;
  if (!emailToUse) {
    emailToUse = window.localStorage.getItem(STORAGE_KEY);
    if (!emailToUse) {
      throw new Error('Please provide the email address you used to sign in.');
    }
  }
  
  try {
    const result = await signInWithEmailLink(auth, emailToUse, window.location.href);
    // Clear the saved email
    window.localStorage.removeItem(STORAGE_KEY);
    return result;
  } catch (error) {
    throw getAuthErrorMessage(error);
  }
}

export function getStoredEmail(): string | null {
  if (!browser) return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

// Google Authentication
export async function signInWithGoogle(): Promise<UserCredential> {
  if (!browser || !auth) {
    throw new Error('Auth not initialized');
  }

  try {
    const provider = new GoogleAuthProvider();
    // Add scopes if needed
    provider.addScope('profile');
    provider.addScope('email');
    
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    throw getAuthErrorMessage(error);
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  if (!browser || !auth) {
    throw new Error('Auth not initialized');
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    await signInWithRedirect(auth, provider);
  } catch (error) {
    throw getAuthErrorMessage(error);
  }
}