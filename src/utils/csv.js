/**
 * CSV Utility for Import/Export
 */

/**
 * Converts JSON array to CSV string
 */
export const jsonToCsv = (data) => {
    if (!data || data.length === 0) return '';
    
    // Get headers
    const headers = Object.keys(data[0]);
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            const escaped = ('' + val).replace(/"/g, '""'); // Escape double quotes
            return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
    }
    
    return csvRows.join('\n');
};

/**
 * Parses CSV string to JSON array
 */
export const csvToJson = (csvText) => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Simple split by comma, ignoring commas inside quotes (basic regex)
        const currentline = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        
        if (!currentline || currentline.length < headers.length) continue;
        
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            let val = currentline[j].trim();
            // Remove surrounding quotes
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1).replace(/""/g, '"');
            }
            // Try to parse as number
            if (!isNaN(val) && val !== '') {
                obj[headers[j]] = Number(val);
            } else {
                obj[headers[j]] = val;
            }
        }
        result.push(obj);
    }
    
    return result;
};

/**
 * Trigger browser download of a file
 */
export const downloadFile = (content, fileName, contentType) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
};
