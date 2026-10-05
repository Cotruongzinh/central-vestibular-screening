import * as SecureStore from 'expo-secure-store';
import { AESEncryptionKey } from 'expo-crypto';

import { DATA_ENCRYPTION_KEY_ALIAS } from '@/constants/storage';

export async function ensureDataEncryptionKey(): Promise<{
  keyHex: string;
  created: boolean;
  keyBits: number;
}> {
  const existing = await SecureStore.getItemAsync(DATA_ENCRYPTION_KEY_ALIAS);

  if (existing) {
    if (!/^[0-9a-fA-F]{64}$/.test(existing)) {
      throw new Error('LOCAL_ENCRYPTION_KEY_INVALID');
    }

    return {
      keyHex: existing,
      created: false,
      keyBits: existing.length * 4,
    };
  }

  const generated = (await AESEncryptionKey.generate(
    256,
  )) as AESEncryptionKey;

  const keyHex = await generated.encoded('hex');

  await SecureStore.setItemAsync(DATA_ENCRYPTION_KEY_ALIAS, keyHex);

  return {
    keyHex,
    created: true,
    keyBits: keyHex.length * 4,
  };
}

export async function loadDataEncryptionKey(): Promise<AESEncryptionKey> {
  const { keyHex } = await ensureDataEncryptionKey();

  return (await AESEncryptionKey.import(
    keyHex,
    'hex',
  )) as AESEncryptionKey;
}
