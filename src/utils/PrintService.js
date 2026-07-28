/**
 * PrintService - Utility for Silent Printing via Hidden iFrame
 */

export const printRecord = (htmlContent) => {
    // Use a single, reusable hidden iframe to avoid removing it while the print dialog is open
    let iframe = document.getElementById('global-print-frame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'global-print-frame';
        iframe.name = 'print-frame';
        // Make it invisible but still part of the layout tree to ensure browser renders it for printing
        iframe.style.position = 'absolute';
        // Force a narrow width to match thermal paper (approx 380px)
        // This prevents Tailwind breakpoints (sm:, md:) from shifting the layout
        iframe.style.width = '380px';
        iframe.style.height = 'auto'; 
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.border = '0';
        
        document.body.appendChild(iframe);
    }
    
    const doc = iframe.contentWindow.document;
    
    // Copy styles from the main document to the iframe
    // Extract all CSS rules from the current document to inline them into the iframe
    // This is the most robust way to ensure styles are available offline on Android
    let inlineStyles = '';
    try {
        for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            try {
                const rules = sheet.cssRules || sheet.rules;
                for (let j = 0; j < rules.length; j++) {
                    inlineStyles += rules[j].cssText;
                }
            } catch (e) {
                // Fallback for cross-origin or failed stylesheets
            }
        }
    } catch (e) {
        console.warn("[PrintService] Style extraction failed, falling back to basic styles.");
    }

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
                        @page { margin: 0; }
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
                        .print-receipt-container { 
                            width: 100%; 
                            max-width: 76mm;
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
        return;
    }

    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Print Receipt</title>
            <style>
                ${inlineStyles}
                @page { margin: 0; }
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
                .print-receipt-container { 
                    width: 100%; 
                    max-width: 76mm;
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

    // Trigger print from the parent side - significantly more reliable on Android Chrome
    const isAndroid = /Android/i.test(navigator.userAgent);
    const delay = isAndroid ? 1000 : 400;

    setTimeout(() => {
        if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
    }, delay);
};
