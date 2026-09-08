package com.careerlabs.lms.api.syllabus.importer;

import java.util.List;

public class SyllabusImportPreviewResponse {

    private boolean valid;
    private int totalModules;
    private int totalTopics;
    private int totalDurationHours;
    private List<SyllabusImportError> errors;
    private List<String> warnings;
    private List<PreviewModule> modules;

    public SyllabusImportPreviewResponse() {}

    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
    public int getTotalModules() { return totalModules; }
    public void setTotalModules(int totalModules) { this.totalModules = totalModules; }
    public int getTotalTopics() { return totalTopics; }
    public void setTotalTopics(int totalTopics) { this.totalTopics = totalTopics; }
    public int getTotalDurationHours() { return totalDurationHours; }
    public void setTotalDurationHours(int totalDurationHours) { this.totalDurationHours = totalDurationHours; }
    public List<SyllabusImportError> getErrors() { return errors; }
    public void setErrors(List<SyllabusImportError> errors) { this.errors = errors; }
    public List<String> getWarnings() { return warnings; }
    public void setWarnings(List<String> warnings) { this.warnings = warnings; }
    public List<PreviewModule> getModules() { return modules; }
    public void setModules(List<PreviewModule> modules) { this.modules = modules; }

    public static class PreviewModule {
        private String title;
        private String description;
        private Integer durationValue;
        private String durationUnit;
        private String status;
        private int totalDurationHours;
        private List<PreviewTopic> topics;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getDurationValue() { return durationValue; }
        public void setDurationValue(Integer durationValue) { this.durationValue = durationValue; }
        public String getDurationUnit() { return durationUnit; }
        public void setDurationUnit(String durationUnit) { this.durationUnit = durationUnit; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public int getTotalDurationHours() { return totalDurationHours; }
        public void setTotalDurationHours(int totalDurationHours) { this.totalDurationHours = totalDurationHours; }
        public List<PreviewTopic> getTopics() { return topics; }
        public void setTopics(List<PreviewTopic> topics) { this.topics = topics; }
    }

    public static class PreviewTopic {
        private String title;
        private String description;
        private Integer durationHours;
        private String status;
        private int rowNumber;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Integer getDurationHours() { return durationHours; }
        public void setDurationHours(Integer durationHours) { this.durationHours = durationHours; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
        public int getRowNumber() { return rowNumber; }
        public void setRowNumber(int rowNumber) { this.rowNumber = rowNumber; }
    }
}
