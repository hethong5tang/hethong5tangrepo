import CryptoJS from 'crypto-js';

const LEGACY_SALT = 'AI_STUDIO_ATOMIC_SYNC_2026';
// Use VITE_ENCRYPTION_KEY if provided, fallback to anon key, then legacy salt
const getSecretKey = () => {
  return import.meta.env.VITE_ENCRYPTION_KEY || 
         import.meta.env.VITE_SUPABASE_ANON_KEY || 
         LEGACY_SALT;
};

export const encryptionService = {
  encrypt(data: string): string {
    try {
      if (!data) return '';
      return CryptoJS.AES.encrypt(data, getSecretKey()).toString();
    } catch (e) {
      console.error('Encryption failed', e);
      return '';
    }
  },
  
  decrypt(encodedData: string): string {
    try {
      if (!encodedData) return '';
      
      const key = getSecretKey();
      const bytes = CryptoJS.AES.decrypt(encodedData, key);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!originalText) {
          // If decryption fails with the new key, try the legacy salt just in case
          const legacyBytes = CryptoJS.AES.decrypt(encodedData, LEGACY_SALT);
          const legacyText = legacyBytes.toString(CryptoJS.enc.Utf8);
          if (legacyText) return legacyText;

          // Fallback to legacy XOR decryption just in case the user has old secrets stored
          const decoded = atob(encodedData);
          let result = '';
          for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ LEGACY_SALT.charCodeAt(i % LEGACY_SALT.length));
          }
          return result;
      }
      
      return originalText;
    } catch (e) {
      console.error('Decryption failed, trying legacy algorithm', e);
      
      // Fallback to legacy XOR
      try {
        const decoded = atob(encodedData);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
          result += String.fromCharCode(decoded.charCodeAt(i) ^ LEGACY_SALT.charCodeAt(i % LEGACY_SALT.length));
        }
        return result;
      } catch (fallbackError) {
        return '';
      }
    }
  }
};
