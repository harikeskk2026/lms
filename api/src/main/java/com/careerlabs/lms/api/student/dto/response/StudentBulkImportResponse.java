package com.careerlabs.lms.api.student.dto.response;

import java.util.ArrayList;
import java.util.List;

public class StudentBulkImportResponse {

    private int totalRows;
    private int importedCount;
    private int failedCount;
    private int enrolledCount;
    private List<StudentResponse> students = new ArrayList<>();
    private List<StudentImportError> errors = new ArrayList<>();

    public StudentBulkImportResponse() {
    }

    public StudentBulkImportResponse(int totalRows, int importedCount, int failedCount, int enrolledCount,
                                     List<StudentResponse> students, List<StudentImportError> errors) {
        this.totalRows = totalRows;
        this.importedCount = importedCount;
        this.failedCount = failedCount;
        this.enrolledCount = enrolledCount;
        this.students = students != null ? students : new ArrayList<>();
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

    public int getEnrolledCount() {
        return enrolledCount;
    }

    public void setEnrolledCount(int enrolledCount) {
        this.enrolledCount = enrolledCount;
    }

    public List<StudentResponse> getStudents() {
        return students;
    }

    public void setStudents(List<StudentResponse> students) {
        this.students = students;
    }

    public List<StudentImportError> getErrors() {
        return errors;
    }

    public void setErrors(List<StudentImportError> errors) {
        this.errors = errors;
    }
}
