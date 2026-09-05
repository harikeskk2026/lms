package com.careerlabs.lms.api.student.dto.response;

public class StudentImportError {

    private int rowNumber;
    private String name;
    private String email;
    private String reason;

    public StudentImportError() {
    }

    public StudentImportError(int rowNumber, String name, String email, String reason) {
        this.rowNumber = rowNumber;
        this.name = name;
        this.email = email;
        this.reason = reason;
    }

    public int getRowNumber() {
        return rowNumber;
    }

    public void setRowNumber(int rowNumber) {
        this.rowNumber = rowNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
