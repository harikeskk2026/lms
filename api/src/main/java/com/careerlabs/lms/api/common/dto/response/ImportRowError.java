package com.careerlabs.lms.api.common.dto.response;

/**
 * Describes a single row that failed to import during a bulk CSV import.
 * {@code entityLabel} carries the human-readable identifier (name, email,
 * title, ...) of the row so the frontend can report it back to the user.
 */
public class ImportRowError {

    private int rowNumber;
    private String entityLabel;
    private String reason;

    public ImportRowError() {
    }

    public ImportRowError(int rowNumber, String entityLabel, String reason) {
        this.rowNumber = rowNumber;
        this.entityLabel = entityLabel;
        this.reason = reason;
    }

    public int getRowNumber() {
        return rowNumber;
    }

    public void setRowNumber(int rowNumber) {
        this.rowNumber = rowNumber;
    }

    public String getEntityLabel() {
        return entityLabel;
    }

    public void setEntityLabel(String entityLabel) {
        this.entityLabel = entityLabel;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}