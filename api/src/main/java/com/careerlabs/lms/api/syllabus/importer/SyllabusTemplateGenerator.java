package com.careerlabs.lms.api.syllabus.importer;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

public class SyllabusTemplateGenerator {

    private static final String[] HEADERS = {
            "Module", "Module Description", "Module Duration", "Duration Unit",
            "Module Status", "Topic", "Topic Description", "Topic Duration (Hours)", "Topic Status"
    };

    private static final String[][] EXAMPLE_ROWS = {
            {"Module 1", "Introduction to Web Development", "10", "HOURS", "PUBLISHED", "HTML Basics", "Introduction to HTML", "3", "PUBLISHED"},
            {"Module 1", "Introduction to Web Development", "10", "HOURS", "PUBLISHED", "HTML Tags", "Common HTML tags", "4", "PUBLISHED"},
            {"Module 1", "Introduction to Web Development", "10", "HOURS", "PUBLISHED", "HTML Forms", "Creating forms", "3", "DRAFT"},
            {"Module 2", "CSS Fundamentals", "2", "DAYS", "DRAFT", "CSS Basics", "Introduction to CSS", "8", "DRAFT"},
    };

    public byte[] generateExcelTemplate() {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Syllabus");
            // header style
            CellStyle headerStyle = wb.createCellStyle();
            Font font = wb.createFont();
            font.setBold(true);
            font.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.VIOLET.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            Row header = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell c = header.createCell(i);
                c.setCellValue(HEADERS[i]);
                c.setCellStyle(headerStyle);
            }
            for (int r = 0; r < EXAMPLE_ROWS.length; r++) {
                Row row = sheet.createRow(r + 1);
                for (int c = 0; c < EXAMPLE_ROWS[r].length; c++) {
                    row.createCell(c).setCellValue(EXAMPLE_ROWS[r][c]);
                }
            }
            for (int i = 0; i < HEADERS.length; i++) sheet.autoSizeColumn(i);
            wb.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Excel template", e);
        }
    }

    public byte[] generateCsvTemplate() {
        StringBuilder sb = new StringBuilder();
        // headers
        sb.append(String.join(",", escapeCsvHeaders(HEADERS))).append("\n");
        for (String[] row : EXAMPLE_ROWS) {
            sb.append(String.join(",", escapeCsvRow(row))).append("\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String[] escapeCsvHeaders(String[] headers) {
        String[] out = new String[headers.length];
        for (int i = 0; i < headers.length; i++) out[i] = escapeCsv(headers[i]);
        return out;
    }

    private String[] escapeCsvRow(String[] row) {
        String[] out = new String[row.length];
        for (int i = 0; i < row.length; i++) out[i] = escapeCsv(row[i]);
        return out;
    }

    private String escapeCsv(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
