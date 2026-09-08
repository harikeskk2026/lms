package com.careerlabs.lms.api.syllabus.importer;

import com.careerlabs.lms.api.syllabus.dto.response.SyllabusModuleResponse;
import java.util.List;

public class SyllabusImportResponse {

    private int importedModulesCount;
    private int importedTopicsCount;
    private List<SyllabusModuleResponse> modules;

    public SyllabusImportResponse() {}

    public SyllabusImportResponse(int importedModulesCount, int importedTopicsCount, List<SyllabusModuleResponse> modules) {
        this.importedModulesCount = importedModulesCount;
        this.importedTopicsCount = importedTopicsCount;
        this.modules = modules;
    }

    public int getImportedModulesCount() { return importedModulesCount; }
    public void setImportedModulesCount(int importedModulesCount) { this.importedModulesCount = importedModulesCount; }
    public int getImportedTopicsCount() { return importedTopicsCount; }
    public void setImportedTopicsCount(int importedTopicsCount) { this.importedTopicsCount = importedTopicsCount; }
    public List<SyllabusModuleResponse> getModules() { return modules; }
    public void setModules(List<SyllabusModuleResponse> modules) { this.modules = modules; }
}
