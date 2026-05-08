import { useToast } from '../components/ToastProvider';

/**
 * Converts an array of objects to a CSV string.
 * @param data Array of objects.
 * @returns A CSV formatted string.
 */
function convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => 
        headers.map(header => {
            let value = obj[header];
            if (value === null || value === undefined) {
                value = '';
            } else {
                value = String(value);
            }
            // Escape double quotes and wrap in double quotes if it contains a comma, double quote, or newline
            if (value.includes('"') || value.includes(',') || value.includes('\n')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
}

/**
 * Exports data to a CSV file and triggers a download.
 * @param filename The name of the file to be downloaded.
 * @param data The array of objects to export.
 */
export const exportToCsv = (filename: string, data: any[]) => {
    if (!data || data.length === 0) {
        // Here we can't use useToast directly as this is a utility function, not a component.
        // The calling component should handle this feedback.
        console.warn("Export cancelled: No data to export.");
        return false;
    }

    const csvString = convertToCSV(data);
    
    // Add BOM for UTF-8 support in Excel
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    return true;
};
