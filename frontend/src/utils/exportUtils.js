import * as XLSX from 'xlsx';

export const exportToExcel = (data, fileName) => {
    // 1. Convert JSON data to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 2. Create a workbook and add the worksheet
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // 3. Generate Excel file buffer
    // 4. Create a download link and trigger it
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
