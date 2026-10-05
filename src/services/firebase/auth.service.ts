import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
  type Unsubscribe,
} from 'firebase/auth';

import { LAST_ACTIVITY_STORAGE_KEY } from '@/constants/session';
import { getFirebaseApp } from '@/config/firebase';

let cachedAuth: Auth | null = null;

function readFirebaseCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app = getFirebaseApp();

  if (!app) {
    throw new Error('FIREBASE_NOT_CONFIGURED');
  }

  try {
    cachedAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch (error) {
    if (readFirebaseCode(error) !== 'auth/already-initialized') {
      throw error;
    }
    cachedAuth = getAuth(app);
  }

  return cachedAuth;
}

export async function registerClinician(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return credential.user;
}

export async function sendClinicianVerification(user: User): Promise<void> {
  await sendEmailVerification(user);
}

export async function refreshClinicianVerification(user: User): Promise<boolean> {
  await reload(user);
  return user.emailVerified;
}

export async function loginClinician(email: string, password: string): Promise<User> {
  const auth = getFirebaseAuth();
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await reload(credential.user);
  return credential.user;
}

export async function requestClinicianPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function signOutClinician(): Promise<void> {
  await AsyncStorage.removeItem(LAST_ACTIVITY_STORAGE_KEY);
  await signOut(getFirebaseAuth());
}

export function getCurrentClinician(): User | null {
  return getFirebaseAuth().currentUser;
}

export function observeClinicianAuth(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export function getAuthErrorMessage(error: unknown): string {
  const code = readFirebaseCode(error);

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.';
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.';
    case 'auth/weak-password':
      return 'Mật khẩu chưa đáp ứng chính sách mật khẩu của Firebase.';
    case 'auth/network-request-failed':
      return 'Không thể kết nối Firebase. Hãy kiểm tra Internet rồi thử lại.';
    case 'auth/too-many-requests':
      return 'Có quá nhiều yêu cầu trong thời gian ngắn. Hãy chờ một lúc rồi thử lại.';
    case 'auth/operation-not-allowed':
      return 'Email/Password chưa được bật trong Firebase Authentication.';
    case 'auth/user-token-expired':
      return 'Phiên xác thực đã hết hạn. Hãy đăng nhập lại.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email hoặc mật khẩu không đúng.';
    case 'auth/user-disabled':
      return 'Tài khoản này đã bị vô hiệu hóa.';
    default:
      if (error instanceof Error && error.message === 'FIREBASE_NOT_CONFIGURED') {
        return 'Firebase chưa được cấu hình. Hãy hoàn tất 02A trước.';
      }
      return 'Đã xảy ra lỗi Firebase. Hãy thử lại.';
  }
}

