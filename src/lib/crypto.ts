import {
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
} from 'expo-crypto';

import { loadDataEncryptionKey } from '@/lib/secure-store';

const PAYLOAD_PREFIX = 'aesgcm:v1:';

export async function encryptJson<T>(value: T): Promise<string> {
  const key = await loadDataEncryptionKey();
  const plaintext = new TextEncoder().encode(JSON.stringify(value));

  const sealedData = await aesEncryptAsync(plaintext, key);
  const combined = await sealedData.combined('base64');

  if (typeof combined !== 'string') {
    throw new Error('LOCAL_ENCRYPTION_SERIALIZE_FAILED');
  }

  return `${PAYLOAD_PREFIX}${combined}`;
}

export async function decryptJson<T>(encryptedPayload: string): Promise<T> {
  if (!encryptedPayload.startsWith(PAYLOAD_PREFIX)) {
    throw new Error('LOCAL_ENCRYPTION_PAYLOAD_VERSION_UNSUPPORTED');
  }

  const key = await loadDataEncryptionKey();
  const combinedBase64 = encryptedPayload.slice(PAYLOAD_PREFIX.length);
  const sealedData = AESSealedData.fromCombined(combinedBase64);

  const plaintext = await aesDecryptAsync(sealedData, key, {
    output: 'bytes',
  });

  if (typeof plaintext === 'string') {
    throw new Error('LOCAL_DECRYPTION_OUTPUT_INVALID');
  }

  const decoded = new TextDecoder().decode(plaintext);

  return JSON.parse(decoded) as T;
}
