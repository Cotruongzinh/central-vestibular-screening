/**
 * Expo / React Native Firebase Auth typing bridge.
 *
 * Firebase's React Native runtime bundle exports getReactNativePersistence,
 * but some Firebase 12 + TypeScript resolution paths expose browser-oriented
 * declarations that omit the symbol. This augments types only and does not
 * replace or patch Firebase runtime code.
 */
import 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(
    storage: unknown,
  ): Persistence;
}
