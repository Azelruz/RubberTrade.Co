/**
 * Utility for Client-side PDF Generation and Export
 * Uses dynamic import of html2pdf.js to keep initial bundle size lean.
 */

/**
 * Exports a DOM element or an HTML string as a downloadable PDF file.
 * Automatically handles Thai fonts, high-DPI canvas rendering, and page breaks.
 * 
 * @param {HTMLElement|string} target - The DOM element or query selector to convert
 * @param {string} filename - The output PDF file name (e.g. 'Report_2026-10-05.pdf')
 * @param {Object} customOptions - Additional html2pdf options
 * @returns {Promise<void>}
 */
export const exportElementToPDF = async (target, filename = 'report.pdf', customOptions = {}) => {
    try {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default || html2pdfModule;

        let element = typeof target === 'string' ? document.querySelector(target) : target;
        if (!element) {
            throw new Error('ไม่พบข้อมูลเอกสารสำหรับการแปลงเป็นไฟล์ PDF');
        }

        // Create a temporary visible clone container if the original element is hidden (e.g. print:block)
        let containerToRender = element;
        let isCloned = false;

        const isHidden = window.getComputedStyle(element).display === 'none' || element.classList.contains('hidden');
        if (isHidden) {
            const clone = element.cloneNode(true);
            clone.classList.remove('hidden');
            clone.classList.remove('print:block');
            clone.style.display = 'block';
            clone.style.position = 'absolute';
            clone.style.top = '-99999px';
            clone.style.left = '0';
            clone.style.width = '794px'; // Standard A4 width in 96dpi pixels
            clone.style.backgroundColor = '#ffffff';
            clone.style.color = '#000000';
            document.body.appendChild(clone);
            containerToRender = clone;
            isCloned = true;
        }

        const opt = {
            margin: [8, 8, 8, 8], // top, left, bottom, right in mm
            filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2, // High resolution for crisp text
                useCORS: true,
                letterRendering: true,
                logging: false,
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: customOptions.orientation || 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
            ...customOptions
        };

        await html2pdf().set(opt).from(containerToRender).save();

        if (isCloned && containerToRender.parentNode) {
            containerToRender.parentNode.removeChild(containerToRender);
        }
    } catch (err) {
        console.error('PDF Export Error:', err);
        throw err;
    }
};
