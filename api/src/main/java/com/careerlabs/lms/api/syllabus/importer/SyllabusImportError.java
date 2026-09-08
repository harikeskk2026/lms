package com.careerlabs.lms.api.syllabus.importer;

public class SyllabusImportError {

    private int rowNumber;
    private String moduleName;
    private String topicName;
    private String field;
    private String message;

    public SyllabusImportError() {}

    public SyllabusImportError(int rowNumber, String moduleName, String topicName, String field, String message) {
        this.rowNumber = rowNumber;
        this.moduleName = moduleName;
        this.topicName = topicName;
        this.field = field;
        this.message = message;
    }

    public int getRowNumber() { return rowNumber; }
    public void setRowNumber(int rowNumber) { this.rowNumber = rowNumber; }
    public String getModuleName() { return moduleName; }
    public void setModuleName(String moduleName) { this.moduleName = moduleName; }
    public String getTopicName() { return topicName; }
    public void setTopicName(String topicName) { this.topicName = topicName; }
    public String getField() { return field; }
    public void setField(String field) { this.field = field; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
