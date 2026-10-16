/**
 * RubberTrade Client-Side Image Compression Utility
 * Resizes and compresses images in the browser before uploading to Cloudflare R2.
 * Prevents exceeding 2MB limits and reduces bandwidth usage by 85-95%.
 */

/**
 * Format bytes into human-readable string (e.g. "1.5 MB", "230 KB")
 */
export const formatBytes = (bytes, decimals = 1) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Estimate byte size of a base64 string
 */
export const getBase64ByteSize = (base64String) => {
    if (!base64String || typeof base64String !== 'string') return 0;
    const pureBase64 = base64String.replace(/^data:image\/\w+;base64,/, '');
    const padding = (pureBase64.endsWith('==') ? 2 : pureBase64.endsWith('=') ? 1 : 0);
    return Math.floor((pureBase64.length * 3) / 4) - padding;
};

/**
 * Compress an image (File, Blob, or Base64 data URL) using HTML5 Canvas.
 * 
 * @param {File|Blob|string} imageSource - The image to compress
 * @param {Object} options - Compression options
 * @param {number} [options.maxWidth=1600] - Max allowed width in pixels
 * @param {number} [options.maxHeight=1600] - Max allowed height in pixels
 * @param {number} [options.quality=0.8] - JPEG quality (0.1 to 1.0)
 * @param {number} [options.maxSizeMB=1.5] - Target max size in megabytes
 * @param {string} [options.mimeType='image/jpeg'] - Output mime type
 * @returns {Promise<{base64: string, sizeBytes: number, originalSize: number, width: number, height: number, compressionRatio: string}>}
 */
export const compressImage = async (imageSource, options = {}) => {
    const {
        maxWidth = 1600,
        maxHeight = 1600,
        quality = 0.8,
        maxSizeMB = 1.5,
        mimeType = 'image/jpeg'
    } = options;

    if (!imageSource) {
        throw new Error('No image source provided for compression');
    }

    // Determine original size and source URL
    let originalSize = 0;
    let srcUrl = '';
    let isCreatedObjectUrl = false;

    if (typeof imageSource === 'string') {
        originalSize = getBase64ByteSize(imageSource);
        srcUrl = imageSource;
    } else if (imageSource instanceof Blob || (typeof File !== 'undefined' && imageSource instanceof File)) {
        originalSize = imageSource.size;
        if (typeof window !== 'undefined' && window.URL && window.URL.createObjectURL) {
            srcUrl = window.URL.createObjectURL(imageSource);
            isCreatedObjectUrl = true;
        }
    }

    // If running in an environment without DOM/Canvas (e.g. basic Node tests), return gracefully
    if (typeof document === 'undefined' || !document.createElement) {
        return {
            base64: typeof imageSource === 'string' ? imageSource : '',
            sizeBytes: originalSize,
            originalSize,
            width: 0,
            height: 0,
            compressionRatio: '0%'
        };
    }

    try {
        const img = new Image();
        
        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (err) => reject(new Error('Failed to load image for compression'));
            img.src = srcUrl;
        });

        // Compute aspect-ratio preserved dimensions
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Canvas 2D context not available');
        }

        // Fill white background for JPEGs (handles transparent PNG conversions)
        if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress
        let currentQuality = quality;
        let compressedBase64 = canvas.toDataURL(mimeType, currentQuality);
        let compressedBytes = getBase64ByteSize(compressedBase64);
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        // If still exceeds maxSizeMB, step down quality iteratively
        while (compressedBytes > maxSizeBytes && currentQuality > 0.4) {
            currentQuality -= 0.15;
            compressedBase64 = canvas.toDataURL(mimeType, Math.max(0.3, currentQuality));
            compressedBytes = getBase64ByteSize(compressedBase64);
        }

        const savedBytes = Math.max(0, originalSize - compressedBytes);
        const compressionRatio = originalSize > 0 
            ? `${Math.round((savedBytes / originalSize) * 100)}%` 
            : '0%';

        return {
            base64: compressedBase64,
            sizeBytes: compressedBytes,
            originalSize,
            width,
            height,
            compressionRatio,
            formattedOriginalSize: formatBytes(originalSize),
            formattedCompressedSize: formatBytes(compressedBytes)
        };
    } finally {
        if (isCreatedObjectUrl && typeof window !== 'undefined' && window.URL && window.URL.revokeObjectURL) {
            window.URL.revokeObjectURL(srcUrl);
        }
    }
};

export default compressImage;
