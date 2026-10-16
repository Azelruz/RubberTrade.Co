/**
 * PrintService - Utility for Silent Printing via Hidden iFrame
 */

let cachedInlineStyles = null;

const getDocumentStyles = () => {
    if (cachedInlineStyles !== null) {
        return cachedInlineStyles;
    }

    let inlineStyles = '';
    try {
        for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                    for (let j = 0; j < rules.length; j++) {
                        inlineStyles += rules[j].cssText;
                    }
                }
            } catch (e) {
                // Fallback for cross-origin or failed stylesheets
            }
        }
    } catch (e) {
        console.warn("[PrintService] Style extraction failed, falling back to basic styles.");
    }

    cachedInlineStyles = inlineStyles;
    return cachedInlineStyles;
};

// Warm up style cache asynchronously on idle/load so first print is instant
if (typeof window !== 'undefined') {
    const requestIdle = window.requestIdleCallback || ((cb) => setTimeout(cb, 500));
    requestIdle(() => getDocumentStyles());
}

// ---------------------------------------------------------------------------
// Print "busy" gate
// Heavy background jobs (data reloads, E-Slip html2canvas capture, etc.) must not
// compete with the print preview for the main thread. They can call
// `whenPrintIdle()` to wait until the current print job has handed off to the
// browser's print dialog (or a safety timeout elapses).
// ---------------------------------------------------------------------------
let activePrintJob = null;
let resolveActivePrintJob = null;
const PRINT_GATE_SAFETY_MS = 4000;

const beginPrintJob = () => {
    if (!activePrintJob) {
        activePrintJob = new Promise((resolve) => { resolveActivePrintJob = resolve; });
    }
    const safety = setTimeout(() => endPrintJob(), PRINT_GATE_SAFETY_MS);
    return () => clearTimeout(safety);
};

const endPrintJob = () => {
    if (resolveActivePrintJob) {
        const resolve = resolveActivePrintJob;
        activePrintJob = null;
        resolveActivePrintJob = null;
        resolve();
    }
};

export const isPrinting = () => activePrintJob !== null;

/** Resolves immediately if no print job is running, otherwise after it hands off to the print dialog. */
export const whenPrintIdle = () => activePrintJob || Promise.resolve();

// Explicitly request the receipt fonts inside the print document. Resolves as soon as
// they are available (usually a few ms from HTTP cache) instead of always waiting for
// the full `document.fonts.ready` timeout.
const RECEIPT_FONT_DESCRIPTORS = [
    '400 16px "Noto Sans Thai"',
    '700 16px "Noto Sans Thai"',
    '400 16px "Inter"',
    '700 16px "Inter"'
];
const FONT_WAIT_CAP_MS = 300;

const waitForReceiptFonts = async (doc) => {
    if (!doc.fonts || typeof doc.fonts.load !== 'function') return;
    try {
        await Promise.race([
            Promise.all(RECEIPT_FONT_DESCRIPTORS.map((d) => doc.fonts.load(d, 'กขค0123').catch(() => null))),
            new Promise((resolve) => setTimeout(resolve, FONT_WAIT_CAP_MS))
        ]);
    } catch (e) {
        // Continue even if font loading fails
    }
};

/**
 * Print HTML via a hidden iframe.
 * @returns {Promise<void>} resolves once the print dialog has been opened (or closed, on
 * browsers where print() is blocking), so callers can safely start background work.
 */
export const printRecord = (htmlContent) => {
    const cancelSafety = beginPrintJob();
    const startedAt = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const finish = () => {
        cancelSafety();
        endPrintJob();
    };
    const jobDone = whenPrintIdle();
    try {
        printRecordInternal(htmlContent, finish, startedAt);
    } catch (err) {
        console.error('[PrintService] printRecord failed:', err);
        finish();
    }
    return jobDone;
};

const printRecordInternal = (htmlContent, finish, startedAt) => {
    // Use a single, reusable hidden iframe to avoid removing it while the print dialog is open
    let iframe = document.getElementById('global-print-frame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'global-print-frame';
        iframe.name = 'print-frame';
        // Make it invisible but still part of the layout tree to ensure browser renders it for printing
        iframe.style.position = 'fixed';
        iframe.style.left = '0';
        iframe.style.top = '0';
        iframe.style.width = '100%';
        iframe.style.height = '100%'; 
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.border = '0';
        iframe.style.zIndex = '-9999';
        
        document.body.appendChild(iframe);
    }
    
    const doc = iframe.contentWindow.document;
    const inlineStyles = getDocumentStyles();

    // Detect iOS devices (iPhone, iPad, iPod) including iPadOS 13+ which registers as MacIntel
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Print Receipt</title>
                    <style>
                        ${inlineStyles}
                        @page { size: auto !important; margin: 0 !important; }
                        body { 
                            margin: 0; 
                            padding: 0; 
                            background: white; 
                            width: 100%; 
                            height: auto;
                            font-family: 'Noto Sans Thai', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                        }
                        .no-print { display: none !important; }
                        /* Force standard thermal paper width */
                        .print-receipt-container, .receipt-content, .receipt-content-inner { 
                            width: 100% !important; 
                            max-width: 100% !important;
                            padding: 1mm; 
                            box-sizing: border-box; 
                            margin: 0;
                            background: white;
                        }
                    </style>
                </head>
                <body>
                    <div class="print-receipt-container">
                        ${htmlContent}
                    </div>
                    <script>
                        window.onload = function() {
                            window.focus();
                            setTimeout(function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                            }, 300);
                        };
                    </script>
                </body>
                </html>
            `);
            printWindow.document.close();
        } else {
            alert("โปรดอนุญาตให้เบราว์เซอร์เปิดป๊อปอัป (Pop-ups) เพื่อแสดงและพิมพ์บิลใน iOS");
        }
        setTimeout(finish, 1000);
        return;
    }

    const fontFaceRules = `
        @font-face {
            font-family: 'Noto Sans Thai';
            src: url('/fonts/NotoSansThai-400.ttf') format('truetype');
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: 'Noto Sans Thai';
            src: url('/fonts/NotoSansThai-600.ttf') format('truetype');
            font-weight: 600;
            font-style: normal;
        }
        @font-face {
            font-family: 'Noto Sans Thai';
            src: url('/fonts/NotoSansThai-700.ttf') format('truetype');
            font-weight: 700;
            font-style: normal;
        }
    `;

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Receipt</title>
            <style>
                ${fontFaceRules}
                ${inlineStyles}
                @page { size: auto !important; margin: 0 !important; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    background: white; 
                    width: 100%; 
                    height: auto;
                    font-family: 'Noto Sans Thai', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                }
                .no-print { display: none !important; }
                /* Force standard thermal paper width (57mm for 58mm printer, or 72mm for 80mm) */
                .print-receipt-container, .receipt-content, .receipt-content-inner { 
                    width: 100% !important; 
                    max-width: 100% !important;
                    padding: 1mm; 
                    box-sizing: border-box; 
                    margin: 0;
                    background: white;
                }
            </style>
        </head>
        <body>
            <div class="print-receipt-container">
                ${htmlContent}
            </div>
        </body>
        </html>
    `);
    doc.close();

    // Trigger print safely: check document readyState, wait for font readiness, wrap in try/catch, and fallback if needed
    const isAndroid = /Android/i.test(navigator.userAgent);
    const minDelay = isAndroid ? 150 : 40;
    let printed = false;

    const doPrint = async () => {
        if (printed) return;
        printed = true;
        try {
            // Ensure Thai fonts are loaded into the iframe document before opening the print preview dialog
            await waitForReceiptFonts(doc);

            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            console.debug(`[PrintService] opening print dialog after ${Math.round(now - startedAt)}ms`);

            if (iframe.contentWindow && typeof iframe.contentWindow.print === 'function') {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } else {
                window.print();
            }
        } catch (printErr) {
            console.warn("[PrintService] Direct iframe print failed, falling back to window.print():", printErr);
            try {
                window.print();
            } catch (fallbackErr) {
                console.error("[PrintService] Fallback print also failed:", fallbackErr);
            }
        } finally {
            // print() is blocking on desktop Chrome/Edge (returns when dialog closes) and
            // non-blocking elsewhere; give the dialog a moment to render before releasing
            // the gate so background jobs don't stall the preview.
            setTimeout(finish, 600);
        }
    };

    // If iframe doc is already parsed and complete, trigger after minDelay. Otherwise, wait for onload.
    if (doc.readyState === 'complete') {
        setTimeout(doPrint, minDelay);
    } else {
        iframe.onload = () => {
            setTimeout(doPrint, minDelay);
            iframe.onload = null;
        };
        // Safety timeout in case onload event does not fire on certain embedded webviews
        // (or a slow logo image delays onload)
        setTimeout(() => {
            if (iframe.onload) {
                iframe.onload = null;
                doPrint();
            }
        }, Math.max(minDelay * 2, 300));
    }
};
