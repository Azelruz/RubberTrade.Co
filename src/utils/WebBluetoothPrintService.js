/**
 * WebBluetoothPrintService.js - Pure Web Bluetooth ESC/POS Text & Raster Printing
 */
import { buildEscPosTextPayload } from './EscPosTextBuilder';

let cachedDevice = null;
let cachedCharacteristic = null;

const PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb', // Standard Thermal Printer Service
    '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile (SPP)
    '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Alternative BLE SPP
];

export const ensureHtml2Canvas = async () => {
    if (window.html2canvas) return window.html2canvas;
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = () => resolve(window.html2canvas);
        script.onerror = (e) => reject(new Error('Failed to load html2canvas library'));
        document.head.appendChild(script);
    });
};

/**
 * Convert Unicode string to TIS-620 / CP874 byte array for ESC/POS Thermal Printers
 */
export const encodeThaiTis620 = (text) => {
    const bytes = [];
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        if (code >= 0x0E01 && code <= 0x0E5B) {
            bytes.push(code - 0x0E00 + 0xA0);
        } else if (code <= 0x007E || code === 0x0A || code === 0x0D) {
            bytes.push(code);
        } else {
            bytes.push(0x3F);
        }
    }
    return new Uint8Array(bytes);
};

/**
 * Request user to pick a Bluetooth Thermal Printer and connect to GATT Server
 */
export const connectBluetoothPrinter = async () => {
    if (!navigator.bluetooth) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth API (แนะนำให้ใช้ Google Chrome บน Android)');
    }

    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: PRINTER_SERVICES
        });

        const server = await device.gatt.connect();
        
        let targetService = null;
        for (const serviceUuid of PRINTER_SERVICES) {
            try {
                targetService = await server.getPrimaryService(serviceUuid);
                if (targetService) break;
            } catch (e) {
                // Try next service UUID
            }
        }

        if (!targetService) {
            const services = await server.getPrimaryServices();
            if (services.length > 0) targetService = services[0];
        }

        if (!targetService) {
            throw new Error('ไม่พบบริการสั่งพิมพ์ (Printer Service) บนอุปกรณ์นี้');
        }

        const characteristics = await targetService.getCharacteristics();
        const writableChar = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

        if (!writableChar) {
            throw new Error('ไม่พบช่องทางส่งข้อมูล (Writable Characteristic) บนอุปกรณ์นี้');
        }

        cachedDevice = device;
        cachedCharacteristic = writableChar;

        return device.name || 'Bluetooth Printer';
    } catch (error) {
        console.error('[WebBluetoothPrintService] Connection Error:', error);
        throw error;
    }
};

/**
 * Fast Pure Text ESC/POS Thermal Printing over Web Bluetooth with Formatting (Bold, Double-Height, Alignment)
 */
export const printViaWebBluetooth = async (recordData, settings = {}, paperSlipConfig = {}) => {
    if (!cachedCharacteristic || !cachedDevice || !cachedDevice.gatt.connected) {
        await connectBluetoothPrinter();
    }

    try {
        const fullPayload = buildEscPosTextPayload(recordData, settings, paperSlipConfig, 32);

        const CHUNK_SIZE = 64;
        for (let i = 0; i < fullPayload.length; i += CHUNK_SIZE) {
            const chunk = fullPayload.slice(i, i + CHUNK_SIZE);
            if (cachedCharacteristic.properties.writeWithoutResponse) {
                await cachedCharacteristic.writeValueWithoutResponse(chunk);
            } else {
                await cachedCharacteristic.writeValue(chunk);
            }
            await new Promise(r => setTimeout(r, 20));
        }

        return true;
    } catch (error) {
        console.error('[WebBluetoothPrintService] Text Print Error:', error);
        cachedDevice = null;
        cachedCharacteristic = null;
        throw error;
    }
};
