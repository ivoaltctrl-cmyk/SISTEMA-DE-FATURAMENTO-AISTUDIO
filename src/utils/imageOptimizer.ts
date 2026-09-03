/**
 * Image optimization utility for mobile camera and photo uploads.
 * Downscales high-resolution camera photos (e.g. 12MP/48MP iPhone photos)
 * to an optimal resolution for OCR and fast upload over mobile 5G/4G networks.
 */

export interface OptimizedImageResult {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}

export const optimizeImageForUpload = async (
  input: File | string,
  maxDimension: number = 1600,
  quality: number = 0.85
): Promise<OptimizedImageResult> => {
  return new Promise((resolve) => {
    try {
      const srcUrl =
        typeof input === 'string'
          ? input
          : URL.createObjectURL(input);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down proportionally if larger than maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            // Fallback if canvas 2D context is not available
            if (typeof input !== 'string') URL.revokeObjectURL(srcUrl);
            resolve({
              base64: typeof input === 'string' ? input : '',
              mimeType: 'image/jpeg',
              width: img.width,
              height: img.height,
            });
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);

          if (typeof input !== 'string') {
            URL.revokeObjectURL(srcUrl);
          }

          resolve({
            base64: compressedBase64,
            mimeType: 'image/jpeg',
            width,
            height,
          });
        } catch (innerErr) {
          console.warn('Canvas compression error, using original image:', innerErr);
          if (typeof input !== 'string') URL.revokeObjectURL(srcUrl);
          resolve({
            base64: typeof input === 'string' ? input : '',
            mimeType: 'image/jpeg',
            width: img.width || 0,
            height: img.height || 0,
          });
        }
      };

      img.onerror = () => {
        console.warn('Failed to load image for optimization, falling back');
        if (typeof input !== 'string') URL.revokeObjectURL(srcUrl);
        resolve({
          base64: typeof input === 'string' ? input : '',
          mimeType: 'image/jpeg',
          width: 0,
          height: 0,
        });
      };

      img.src = srcUrl;
    } catch (err) {
      console.warn('optimizeImageForUpload catch error:', err);
      resolve({
        base64: typeof input === 'string' ? input : '',
        mimeType: 'image/jpeg',
        width: 0,
        height: 0,
      });
    }
  });
};
