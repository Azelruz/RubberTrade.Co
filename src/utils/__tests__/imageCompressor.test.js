import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatBytes, getBase64ByteSize, compressImage } from '../imageCompressor';

describe('Image Compressor Utility', () => {
    it('formats bytes correctly into human-readable strings', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1024 * 1024)).toBe('1 MB');
        expect(formatBytes(2.5 * 1024 * 1024)).toBe('2.5 MB');
        expect(formatBytes(500)).toBe('500 B');
    });

    it('accurately calculates byte size from base64 string', () => {
        const emptyBase64 = 'data:image/png;base64,';
        expect(getBase64ByteSize(emptyBase64)).toBe(0);

        // 'Hello' base64 is 'SGVsbG8=' (5 bytes)
        const helloBase64 = 'data:image/jpeg;base64,SGVsbG8=';
        expect(getBase64ByteSize(helloBase64)).toBe(5);

        // 'Hello World' base64 is 'SGVsbG8gV29ybGQ=' (11 bytes)
        const worldBase64 = 'data:image/jpeg;base64,SGVsbG8gV29ybGQ=';
        expect(getBase64ByteSize(worldBase64)).toBe(11);
    });

    it('rejects with error when no image source is provided', async () => {
        await expect(compressImage(null)).rejects.toThrow('No image source provided');
    });

    it('handles image compression with mocked canvas environment', async () => {
        // Mock DOM elements in Node test runner
        const mockContext = {
            fillStyle: '',
            fillRect: vi.fn(),
            drawImage: vi.fn()
        };

        const mockCanvas = {
            width: 0,
            height: 0,
            getContext: vi.fn().mockReturnValue(mockContext),
            toDataURL: vi.fn().mockReturnValue('data:image/jpeg;base64,SGVsbG8=')
        };

        global.document = {
            createElement: vi.fn((tag) => {
                if (tag === 'canvas') return mockCanvas;
                return {};
            })
        };

        // Mock Image constructor
        global.Image = class {
            constructor() {
                this.width = 3000;
                this.height = 2000;
                setTimeout(() => {
                    if (this.onload) this.onload();
                }, 10);
            }
        };

        const result = await compressImage('data:image/jpeg;base64,SGVsbG8gV29ybGQgTG9uZyBJbWFnZSBEYXRh', {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.8
        });

        expect(result).toBeDefined();
        expect(result.width).toBeLessThanOrEqual(1600);
        expect(result.base64).toBe('data:image/jpeg;base64,SGVsbG8=');
        expect(result.sizeBytes).toBe(5);
        expect(result.formattedCompressedSize).toBe('5 B');
    });
});
