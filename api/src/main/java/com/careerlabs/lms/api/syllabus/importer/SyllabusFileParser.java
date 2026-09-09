package com.careerlabs.lms.api.syllabus.importer;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
public class SyllabusFileParser {

    public static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("csv", "xlsx", "xls");

    private static final List<String> EXPECTED_HEADERS_CANONICAL = List.of(
            "module", "module description", "module duration", "duration unit",
            "module status", "topic", "topic description", "topic duration (hours)", "topic status"
    );

    // Map normalized header -> field key
    private static final Map<String, String> HEADER_ALIASES = new HashMap<>();
    static {
        HEADER_ALIASES.put("module", "module");
        HEADER_ALIASES.put("module description", "moduleDescription");
        HEADER_ALIASES.put("module duration", "moduleDuration");
        HEADER_ALIASES.put("duration unit", "durationUnit");
        HEADER_ALIASES.put("module status", "moduleStatus");
        HEADER_ALIASES.put("topic", "topic");
        HEADER_ALIASES.put("topic description", "topicDescription");
        HEADER_ALIASES.put("topic duration (hours)", "topicDuration");
        HEADER_ALIASES.put("topic duration", "topicDuration");
        HEADER_ALIASES.put("topic duration(hours)", "topicDuration");
        HEADER_ALIASES.put("topic duration hours", "topicDuration");
        HEADER_ALIASES.put("topic status", "topicStatus");
    }

    public List<ParsedSyllabusRow> parse(MultipartFile file) {
        validateFile(file);
        String filename = file.getOriginalFilename();
        String ext = getExtension(filename).toLowerCase();
        try {
            if ("csv".equals(ext)) {
                return parseCsv(file);
            } else if ("xlsx".equals(ext) || "xls".equals(ext)) {
                return parseExcel(file);
            } else {
                throw new BadRequestException("Unsupported file format. Supported: .xlsx, .xls, .csv");
            }
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Failed to parse file: " + e.getMessage());
        }
    }

    public void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File is empty");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size exceeds 5 MB limit");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isBlank()) {
            throw new BadRequestException("File name is required");
        }
        String ext = getExtension(filename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new BadRequestException("Unsupported file format. Supported: .xlsx, .xls, .csv");
        }
    }

    private String getExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        if (idx == -1 || idx == filename.length() - 1) return "";
        return filename.substring(idx + 1);
    }

    private List<ParsedSyllabusRow> parseCsv(MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        if (bytes.length == 0) throw new BadRequestException("File is empty");
        String content = new String(bytes, StandardCharsets.UTF_8).trim();
        if (content.isEmpty()) throw new BadRequestException("File is empty");
        // Strip UTF-8 BOM if present (Excel exports CSV with BOM)
        if (content.charAt(0) == '\uFEFF') {
            content = content.substring(1);
            bytes = content.getBytes(StandardCharsets.UTF_8);
        }
        // Detect malformed by checking header line exists
        try (Reader reader = new InputStreamReader(new ByteArrayInputStream(bytes), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT
                     .builder()
                     .setHeader()
                     .setSkipHeaderRecord(true)
                     .setTrim(true)
                     .setIgnoreHeaderCase(false)
                     .build()
                     .parse(reader)) {

            Map<String, Integer> headerMap = parser.getHeaderMap();
            if (headerMap == null || headerMap.isEmpty()) {
                throw new BadRequestException("Missing required headers");
            }
            Map<String, Integer> normalizedHeaderIndex = mapHeaders(headerMap);
            validateRequiredHeaders(normalizedHeaderIndex);

            List<ParsedSyllabusRow> rows = new ArrayList<>();
            for (CSVRecord record : parser) {
                // Skip fully empty rows
                boolean allBlank = true;
                for (String v : record) {
                    if (v != null && !v.trim().isEmpty()) { allBlank = false; break; }
                }
                if (allBlank) continue;

                int rowNum = (int) record.getRecordNumber() + 1; // header is row 1, getRecordNumber is 1-based for data
                String module = getCsvValue(record, normalizedHeaderIndex, "module");
                String moduleDescription = getCsvValue(record, normalizedHeaderIndex, "moduleDescription");
                String moduleDuration = getCsvValue(record, normalizedHeaderIndex, "moduleDuration");
                String durationUnit = getCsvValue(record, normalizedHeaderIndex, "durationUnit");
                String moduleStatus = getCsvValue(record, normalizedHeaderIndex, "moduleStatus");
                String topic = getCsvValue(record, normalizedHeaderIndex, "topic");
                String topicDescription = getCsvValue(record, normalizedHeaderIndex, "topicDescription");
                String topicDuration = getCsvValue(record, normalizedHeaderIndex, "topicDuration");
                String topicStatus = getCsvValue(record, normalizedHeaderIndex, "topicStatus");

                rows.add(new ParsedSyllabusRow(rowNum, module, moduleDescription, moduleDuration,
                        durationUnit, moduleStatus, topic, topicDescription, topicDuration, topicStatus));
            }
            if (rows.isEmpty()) {
                throw new BadRequestException("File contains no data rows");
            }
            return rows;
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Malformed CSV file: " + e.getMessage());
        }
    }

    private String getCsvValue(CSVRecord record, Map<String, Integer> idxMap, String field) {
        Integer idx = idxMap.get(field);
        if (idx == null) return "";
        if (idx >= record.size()) return "";
        String v = record.get(idx);
        return v != null ? v.trim() : "";
    }

    private List<ParsedSyllabusRow> parseExcel(MultipartFile file) throws IOException {
        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) throw new BadRequestException("Excel file is empty or malformed");

            // Find header row: first non-empty row
            Row headerRow = null;
            int headerRowNum = -1;
            for (Row r : sheet) {
                if (r == null) continue;
                boolean hasValue = false;
                for (Cell c : r) {
                    String v = getCellString(c);
                    if (!v.isBlank()) { hasValue = true; break; }
                }
                if (hasValue) { headerRow = r; headerRowNum = r.getRowNum(); break; }
            }
            if (headerRow == null) throw new BadRequestException("Missing required headers");

            // Build header map: normalized header -> column index
            Map<String, Integer> normalizedHeaderIndex = new HashMap<>();
            DataFormatter formatter = new DataFormatter();
            // We need to capture original normalized header string to map via aliases
            for (Cell cell : headerRow) {
                String raw = getCellString(cell);
                if (raw.isBlank()) continue;
                String normalized = normalizeHeader(raw);
                String field = HEADER_ALIASES.get(normalized);
                if (field != null) {
                    normalizedHeaderIndex.put(field, cell.getColumnIndex());
                } else {
                    // Try raw lower trimmed as key to detect required headers, but store as is? For validation we need to allow unknown columns to be ignored, but required presence checked
                    // Keep as normalized to detect errors: if header not in alias, ignore but don't create field
                }
            }
            // Also check for required headers via scanning raw headers that map to module/topic
            // If alias missing, required validation will fail
            validateRequiredHeaders(normalizedHeaderIndex);

            // Also validate that at least module and topic headers exist (via alias)
            List<ParsedSyllabusRow> rows = new ArrayList<>();
            int lastRowNum = sheet.getLastRowNum();
            for (int i = headerRowNum + 1; i <= lastRowNum; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                // Check if row is entirely blank
                boolean allBlank = true;
                for (int cn = row.getFirstCellNum(); cn < row.getLastCellNum(); cn++) {
                    if (cn < 0) continue;
                    Cell c = row.getCell(cn);
                    if (c != null && !getCellString(c).isBlank()) { allBlank = false; break; }
                }
                if (allBlank) continue;
                // Also include rows beyond last cell but maybe empty -> skip
                int excelRowNumber = i + 1; // 1-based
                String module = getCellByField(row, normalizedHeaderIndex, "module");
                String moduleDescription = getCellByField(row, normalizedHeaderIndex, "moduleDescription");
                String moduleDuration = getCellByField(row, normalizedHeaderIndex, "moduleDuration");
                String durationUnit = getCellByField(row, normalizedHeaderIndex, "durationUnit");
                String moduleStatus = getCellByField(row, normalizedHeaderIndex, "moduleStatus");
                String topic = getCellByField(row, normalizedHeaderIndex, "topic");
                String topicDescription = getCellByField(row, normalizedHeaderIndex, "topicDescription");
                String topicDuration = getCellByField(row, normalizedHeaderIndex, "topicDuration");
                String topicStatus = getCellByField(row, normalizedHeaderIndex, "topicStatus");

                // If completely blank after trimming, skip
                boolean rowBlank = module.isBlank() && topic.isBlank() && moduleDescription.isBlank()
                        && moduleDuration.isBlank() && durationUnit.isBlank() && moduleStatus.isBlank()
                        && topicDescription.isBlank() && topicDuration.isBlank() && topicStatus.isBlank();
                if (rowBlank) continue;

                rows.add(new ParsedSyllabusRow(excelRowNumber, module, moduleDescription, moduleDuration,
                        durationUnit, moduleStatus, topic, topicDescription, topicDuration, topicStatus));
            }
            if (rows.isEmpty()) {
                throw new BadRequestException("File contains no data rows");
            }
            return rows;
        } catch (BadRequestException e) { throw e; }
        catch (Exception e) {
            if (e.getMessage() != null && e.getMessage().contains("Malformed")) throw new BadRequestException(e.getMessage());
            throw new BadRequestException("Malformed Excel file: " + e.getMessage());
        }
    }

    private String getCellByField(Row row, Map<String, Integer> idxMap, String field) {
        Integer idx = idxMap.get(field);
        if (idx == null) return "";
        Cell cell = row.getCell(idx);
        return getCellString(cell).trim();
    }

    private String getCellString(Cell cell) {
        if (cell == null) return "";
        DataFormatter formatter = new DataFormatter();
        // For numeric cells, formatter handles correctly
        // For formula, evaluate string
        try {
            String v = formatter.formatCellValue(cell);
            return v != null ? v.trim() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private Map<String, Integer> mapHeaders(Map<String, Integer> headerMap) {
        Map<String, Integer> normalized = new HashMap<>();
        for (Map.Entry<String, Integer> e : headerMap.entrySet()) {
            String raw = e.getKey();
            if (raw == null) continue;
            String norm = normalizeHeader(raw);
            String field = HEADER_ALIASES.get(norm);
            if (field != null) {
                normalized.put(field, e.getValue());
            }
        }
        return normalized;
    }

    private String normalizeHeader(String header) {
        if (header == null) return "";
        String t = header.trim().toLowerCase();
        // collapse multiple spaces
        t = t.replaceAll("\\s+", " ");
        // remove extra spaces around parentheses for topic duration
        // e.g., "topic duration ( hours )" -> "topic duration (hours)"
        t = t.replaceAll("\\(\\s+", "(").replaceAll("\\s+\\)", ")");
        return t;
    }

    private void validateRequiredHeaders(Map<String, Integer> normalizedHeaderIndex) {
        List<String> missing = new ArrayList<>();
        if (!normalizedHeaderIndex.containsKey("module")) missing.add("Module");
        if (!normalizedHeaderIndex.containsKey("topic")) missing.add("Topic");
        if (!missing.isEmpty()) {
            throw new BadRequestException("Missing required headers: " + String.join(", ", missing));
        }
    }
}
