const SECRET_SALT = 'AI_STUDIO_ATOMIC_SYNC_2026';

export const encryptionService = {
  encrypt(data: string): string {
    try {
      if (!data) return '';
      let result = '';
      for (let i = 0; i < data.length; i++) {
        result += String.fromCharCode(data.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length));
      }
      return btoa(result);
    } catch (e) {
      console.error('Encryption failed', e);
      return '';
    }
  },
  
  decrypt(encodedData: string): string {
    try {
      if (!encodedData) return '';
      const decoded = atob(encodedData);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(decoded.charCodeAt(i) ^ SECRET_SALT.charCodeAt(i % SECRET_SALT.length));
      }
      return result;
    } catch (e) {
      console.error('Decryption failed', e);
      return '';
    }
  }
};
