// utils/fileHelpers.js - File upload va validation utilities

/**
 * Faylni Base64 formatiga o'tkazish
 * @param {File} file - Yuklangan fayl
 * @returns {Promise<String>} Base64 string
 */
export const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Rasm faylini tekshirish
 * @param {File} file - Tekshiriladigan fayl
 * @returns {Object} {valid: boolean, error?: string}
 */
export const validateImageFile = (file) => {
  // Qabul qilinadigan fayl turlari
  const validTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png', 
    'image/gif', 
    'image/webp',
    'image/svg+xml'
  ];
  
  // Maksimal hajm (5MB)
  const maxSize = 5 * 1024 * 1024;

  // Fayl turi tekshiruvi
  if (!validTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: '❌ Faqat rasm fayllari yuklanadi (JPG, PNG, GIF, WEBP, SVG)' 
    };
  }

  // Fayl hajmi tekshiruvi
  if (file.size > maxSize) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return { 
      valid: false, 
      error: `❌ Fayl hajmi ${sizeMB}MB. Maksimal 5MB bo'lishi kerak` 
    };
  }

  // Fayl nomi tekshiruvi (ixtiyoriy)
  if (file.name.length > 100) {
    return {
      valid: false,
      error: '❌ Fayl nomi juda uzun (100 belgidan ko\'p)'
    };
  }

  return { valid: true };
};

/**
 * Fayl hajmini formatlash
 * @param {Number} bytes - Baytlarda hajm
 * @returns {String} Formatlangan hajm (KB, MB)
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Rasmni compress qilish (ixtiyoriy)
 * @param {File} file - Asl fayl
 * @param {Number} maxWidth - Maksimal kenglik
 * @param {Number} quality - Sifat (0-1)
 * @returns {Promise<String>} Compressed base64
 */
export const compressImage = (file, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Agar kenglik maksimaldan katta bo'lsa, kichraytirish
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Base64 ga o'tkazish
        const compressed = canvas.toDataURL(file.type, quality);
        resolve(compressed);
      };
      
      img.onerror = () => reject(new Error('Rasmni yuklashda xatolik'));
    };
    
    reader.onerror = () => reject(new Error('Faylni o\'qishda xatolik'));
  });
};

/**
 * Faylning extension-ni olish
 * @param {String} filename - Fayl nomi
 * @returns {String} Extension (.jpg, .png, etc.)
 */
export const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
};

/**
 * URL dan fayl nomini olish
 * @param {String} url - Fayl URL-i
 * @returns {String} Fayl nomi
 */
export const getFileNameFromUrl = (url) => {
  return url.split('/').pop().split('?')[0];
};

/**
 * Multiple fayllarni validate qilish
 * @param {FileList} files - Ko'p fayllar
 * @param {Number} maxFiles - Maksimal fayl soni
 * @returns {Object} Validation natijasi
 */
export const validateMultipleFiles = (files, maxFiles = 5) => {
  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `❌ Maksimal ${maxFiles}ta fayl yuklash mumkin`
    };
  }
  
  // Har bir faylni tekshirish
  for (let file of files) {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      return validation;
    }
  }
  
  return { valid: true };
};

/**
 * Data URL dan Blob yaratish
 * @param {String} dataUrl - Base64 data URL
 * @returns {Blob} Blob obyekt
 */
export const dataURLtoBlob = (dataUrl) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
};

/**
 * Blob-ni File-ga o'tkazish
 * @param {Blob} blob - Blob obyekt
 * @param {String} filename - Fayl nomi
 * @returns {File} File obyekt
 */
export const blobToFile = (blob, filename) => {
  return new File([blob], filename, { type: blob.type });
};

export default {
  convertToBase64,
  validateImageFile,
  formatFileSize,
  compressImage,
  getFileExtension,
  getFileNameFromUrl,
  validateMultipleFiles,
  dataURLtoBlob,
  blobToFile
};