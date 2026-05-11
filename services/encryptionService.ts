import CryptoJS from 'crypto-js';

const SECRET_SALT = 'AI_STUDIO_ATOMIC_SYNC_2026'; // Not fully secure on client-side, but much better than XOR

export const encryptionService = {
  encrypt(data: string): string {
    try {
      if (!data) return '';
      return CryptoJS.AES.encrypt(data, SECRET_SALT).toString();
    } catch (e) {
      console.error('Encryption failed', e);
      return '';
    }
  },
  
  decrypt(encodedData: string): string {
    try {
      if (!encodedData) return '';
      const bytes = CryptoJS.AES.decrypt(encodedData, SECRET_SALT);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!originalText) {
          // Fallback to legacy XOR decryption just in case the user has old secrets stored
          const decoded = atob(encodedData);
          let result = '';
          for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length));
          }
          return result;
      }
      
      return originalText;
    } catch (e) {
      console.error('Decryption failed', e);
      
      // Fallback to legacy XOR
      try {
        const decoded = atob(encodedData);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
          result += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length));
        }
        return result;
      } catch (fallbackError) {
        return '';
      }
    }
  }
};
