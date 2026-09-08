package com.careerlabs.lms.api.syllabus.importer;

public class ParsedSyllabusRow {

    private final int rowNumber;
    private final String module;
    private final String moduleDescription;
    private final String moduleDuration;
    private final String durationUnit;
    private final String moduleStatus;
    private final String topic;
    private final String topicDescription;
    private final String topicDuration;
    private final String topicStatus;

    public ParsedSyllabusRow(int rowNumber, String module, String moduleDescription,
                             String moduleDuration, String durationUnit, String moduleStatus,
                             String topic, String topicDescription, String topicDuration,
                             String topicStatus) {
        this.rowNumber = rowNumber;
        this.module = module;
        this.moduleDescription = moduleDescription;
        this.moduleDuration = moduleDuration;
        this.durationUnit = durationUnit;
        this.moduleStatus = moduleStatus;
        this.topic = topic;
        this.topicDescription = topicDescription;
        this.topicDuration = topicDuration;
        this.topicStatus = topicStatus;
    }

    public int getRowNumber() { return rowNumber; }
    public String getModule() { return module; }
    public String getModuleDescription() { return moduleDescription; }
    public String getModuleDuration() { return moduleDuration; }
    public String getDurationUnit() { return durationUnit; }
    public String getModuleStatus() { return moduleStatus; }
    public String getTopic() { return topic; }
    public String getTopicDescription() { return topicDescription; }
    public String getTopicDuration() { return topicDuration; }
    public String getTopicStatus() { return topicStatus; }
}
