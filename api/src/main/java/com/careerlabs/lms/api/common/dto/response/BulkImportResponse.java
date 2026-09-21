package com.careerlabs.lms.api.common.dto.response;

import java.util.ArrayList;
import java.util.List;

/**
 * Generic summary returned by every bulk CSV import endpoint. {@code imported}
 * holds the response DTOs of the rows that were persisted successfully and
 * {@code errors} lists the rows that failed, with their reasons, so the client
 * can render the failures (and offer an error-row download).
 */
public class BulkImportResponse<T> {

    private int totalRows;
    private int importedCount;
    private int failedCount;
    private List<T> imported = new ArrayList<>();
    private List<ImportRowError> errors = new ArrayList<>();

    public BulkImportResponse() {
    }

    public BulkImportResponse(int totalRows, int importedCount, int failedCount,
                              List<T> imported, List<ImportRowError> errors) {
        this.totalRows = totalRows;
        this.importedCount = importedCount;
        this.failedCount = failedCount;
        this.imported = imported != null ? imported : new ArrayList<>();
        this.errors = errors != null ? errors : new ArrayList<>();
    }

    public int getTotalRows() {
        return totalRows;
    }

    public void setTotalRows(int totalRows) {
        this.totalRows = totalRows;
    }

    public int getImportedCount() {
        return importedCount;
    }

    public void setImportedCount(int importedCount) {
        this.importedCount = importedCount;
    }

    public int getFailedCount() {
        return failedCount;
    }

    public void setFailedCount(int failedCount) {
        this.failedCount = failedCount;
    }

    public List<T> getImported() {
        return imported;
    }

    public void setImported(List<T> imported) {
        this.imported = imported != null ? imported : new ArrayList<>();
    }

    public List<ImportRowError> getErrors() {
        return errors;
    }

    public void setErrors(List<ImportRowError> errors) {
        this.errors = errors != null ? errors : new ArrayList<>();
    }
}