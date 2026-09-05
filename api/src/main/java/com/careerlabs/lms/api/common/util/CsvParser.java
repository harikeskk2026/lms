package com.careerlabs.lms.api.common.util;

import com.careerlabs.lms.api.common.exception.BadRequestException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
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

        BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));
        List<List<String>> allTokens = parseTokens(reader);

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

    private static List<List<String>> parseTokens(BufferedReader reader) throws IOException {
        List<List<String>> rows = new ArrayList<>();
        List<String> currentRow = new ArrayList<>();
        StringBuilder currentField = new StringBuilder();
        boolean inQuotes = false;

        int ch;
        while ((ch = reader.read()) != -1) {
            char c = (char) ch;

            if (c == '"') {
                if (inQuotes) {
                    // Peek next char to see if it's an escaped quote ("")
                    reader.mark(1);
                    int next = reader.read();
                    if (next == '"') {
                        currentField.append('"');
                    } else {
                        inQuotes = false;
                        if (next != -1) {
                            reader.reset();
                        }
                    }
                } else {
                    inQuotes = true;
                }
            } else if (c == ',' && !inQuotes) {
                currentRow.add(currentField.toString());
                currentField.setLength(0);
            } else if ((c == '\n' || c == '\r') && !inQuotes) {
                if (c == '\r') {
                    // Handle \r\n
                    reader.mark(1);
                    int next = reader.read();
                    if (next != '\n' && next != -1) {
                        reader.reset();
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

        // Add trailing field and row if any
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
