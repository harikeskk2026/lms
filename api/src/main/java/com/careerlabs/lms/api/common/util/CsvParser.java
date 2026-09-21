package com.careerlabs.lms.api.common.util;

import com.careerlabs.lms.api.common.exception.BadRequestException;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Robust, lightweight RFC-4180 compliant CSV parser.
 * Handles quoted cells, escaped quotes (""), embedded commas, multiline values,
 * and strips UTF-8 Byte Order Mark (BOM) if present.
 */
public class CsvParser {

    public static class ParsedRow {
        private final int rowNumber;
        private final Map<String, String> valuesByHeader;
        private final List<String> rawValues;

        public ParsedRow(int rowNumber, Map<String, String> valuesByHeader, List<String> rawValues) {
            this.rowNumber = rowNumber;
            this.valuesByHeader = valuesByHeader;
            this.rawValues = rawValues;
        }

        public int getRowNumber() {
            return rowNumber;
        }

        public String get(String... candidateKeys) {
            for (String key : candidateKeys) {
                if (key == null) continue;
                String normalized = normalizeHeaderKey(key);
                String val = valuesByHeader.get(normalized);
                if (val != null && !val.isBlank()) {
                    return val.trim();
                }
            }
            return null;
        }

        public List<String> getRawValues() {
            return rawValues;
        }

        public boolean isAllEmpty() {
            for (String val : rawValues) {
                if (val != null && !val.trim().isEmpty()) {
                    return false;
                }
            }
            return true;
        }
    }

    public static class ParseResult {
        private final List<String> headers;
        private final List<ParsedRow> rows;

        public ParseResult(List<String> headers, List<ParsedRow> rows) {
            this.headers = headers;
            this.rows = rows;
        }

        public List<String> getHeaders() {
            return headers;
        }

        public List<ParsedRow> getRows() {
            return rows;
        }
    }

    public static ParseResult parse(InputStream inputStream) throws IOException {
        if (inputStream == null) {
            throw new BadRequestException("CSV file input stream is null");
        }

        byte[] rawBytes = inputStream.readAllBytes();
        String content = new String(rawBytes, StandardCharsets.UTF_8);
        char delimiter = sniffDelimiter(content);
        List<List<String>> allTokens = parseTokens(content, delimiter);

        if (allTokens.isEmpty()) {
            throw new BadRequestException("Uploaded CSV file is empty");
        }

        // Find header row (first row that has at least one non-empty cell)
        int headerIndex = -1;
        List<String> rawHeaders = null;
        for (int i = 0; i < allTokens.size(); i++) {
            List<String> row = allTokens.get(i);
            boolean hasNonEmpty = row.stream().anyMatch(s -> s != null && !s.trim().isEmpty());
            if (hasNonEmpty) {
                headerIndex = i;
                rawHeaders = row;
                break;
            }
        }

        if (headerIndex == -1 || rawHeaders == null) {
            throw new BadRequestException("Uploaded CSV file contains no header row or data");
        }

        // Clean headers and strip BOM from first header token
        List<String> cleanHeaders = new ArrayList<>();
        Map<Integer, String> colIndexToNormalizedKey = new HashMap<>();

        for (int i = 0; i < rawHeaders.size(); i++) {
            String col = rawHeaders.get(i);
            if (col != null) {
                col = col.replace("\uFEFF", "").trim();
            } else {
                col = "";
            }
            cleanHeaders.add(col);
            String normalizedKey = normalizeHeaderKey(col);
            if (!normalizedKey.isEmpty()) {
                colIndexToNormalizedKey.put(i, normalizedKey);
            }
        }

        List<ParsedRow> parsedRows = new ArrayList<>();
        int actualRowCounter = headerIndex + 1; // 1-based row index for header

        for (int r = headerIndex + 1; r < allTokens.size(); r++) {
            actualRowCounter++;
            List<String> rowTokens = allTokens.get(r);

            // Check if entirely empty
            boolean isEmpty = rowTokens.stream().allMatch(s -> s == null || s.trim().isEmpty());
            if (isEmpty) {
                continue; // Ignore blank lines
            }

            Map<String, String> rowMap = new HashMap<>();
            for (int c = 0; c < rowTokens.size(); c++) {
                String token = rowTokens.get(c) != null ? rowTokens.get(c).trim() : "";
                String headerKey = colIndexToNormalizedKey.get(c);
                if (headerKey != null) {
                    rowMap.put(headerKey, token);
                }
            }

            parsedRows.add(new ParsedRow(actualRowCounter, rowMap, rowTokens));
        }

        return new ParseResult(cleanHeaders, parsedRows);
    }

    /**
     * Sniffs the delimiter from the first non-blank line of the CSV content.
     * Supports comma, semicolon, tab and pipe so files exported from various
     * locales (e.g. Excel "CSV (semicolon)") are handled correctly.
     */
    private static char sniffDelimiter(String content) {
        String firstLine = null;
        int start = 0;
        while (start < content.length()) {
            int nl = content.indexOf('\n', start);
            String line = nl < 0 ? content.substring(start) : content.substring(start, nl);
            if (!line.isBlank()) {
                firstLine = line;
                break;
            }
            if (nl < 0) {
                break;
            }
            start = nl + 1;
        }

        if (firstLine == null || firstLine.isBlank()) {
            return ',';
        }

        char best = ',';
        int bestCount = -1;
        for (char candidate : new char[]{',', ';', '\t', '|'}) {
            int count = countOutsideQuotes(firstLine, candidate);
            if (count > bestCount) {
                best = candidate;
                bestCount = count;
            }
        }
        return best;
    }

    private static int countOutsideQuotes(String line, char delimiter) {
        int count = 0;
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == delimiter && !inQuotes) {
                count++;
            }
        }
        return count;
    }

    private static List<List<String>> parseTokens(String content, char delimiter) {
        List<List<String>> rows = new ArrayList<>();
        List<String> currentRow = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < content.length(); i++) {
            char c = content.charAt(i);

            if (c == '"') {
                if (inQuotes) {
                    if (i + 1 < content.length() && content.charAt(i + 1) == '"') {
                        currentField.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    inQuotes = true;
                }
            } else if (c == delimiter && !inQuotes) {
                currentRow.add(currentField.toString());
                currentField.setLength(0);
            } else if ((c == '\n' || c == '\r') && !inQuotes) {
                if (c == '\r') {
                    if (i + 1 < content.length() && content.charAt(i + 1) == '\n') {
                        i++;
                    }
                }
                currentRow.add(currentField.toString());
                currentField.setLength(0);
                rows.add(currentRow);
                currentRow = new ArrayList<>();
            } else {
                currentField.append(c);
            }
        }

        if (currentField.length() > 0 || !currentRow.isEmpty()) {
            currentRow.add(currentField.toString());
            rows.add(currentRow);
        }

        return rows;
    }

    public static String normalizeHeaderKey(String header) {
        if (header == null) return "";
        return header.replace("\uFEFF", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
    }
}
