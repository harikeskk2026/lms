package com.careerlabs.lms.api.syllabus.importer;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.course.entity.Course;
import com.careerlabs.lms.api.course.entity.CourseStatus;
import com.careerlabs.lms.api.course.repository.CourseRepository;
import com.careerlabs.lms.api.syllabus.dto.response.SyllabusModuleResponse;
import com.careerlabs.lms.api.syllabus.entity.DurationUnit;
import com.careerlabs.lms.api.syllabus.entity.SyllabusModule;
import com.careerlabs.lms.api.syllabus.entity.SyllabusTopic;
import com.careerlabs.lms.api.syllabus.repository.SyllabusModuleRepository;
import com.careerlabs.lms.api.syllabus.repository.SyllabusTopicRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;

@Service
public class SyllabusImportServiceImpl implements SyllabusImportService {

    private final SyllabusFileParser fileParser;
    private final CourseRepository courseRepository;
    private final SyllabusModuleRepository moduleRepository;
    private final SyllabusTopicRepository topicRepository;

    public SyllabusImportServiceImpl(SyllabusFileParser fileParser,
                                     CourseRepository courseRepository,
                                     SyllabusModuleRepository moduleRepository,
                                     SyllabusTopicRepository topicRepository) {
        this.fileParser = fileParser;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.topicRepository = topicRepository;
    }

    @Override
    public SyllabusImportPreviewResponse preview(Long courseId, MultipartFile file) {
        findCourseOrThrow(courseId);
        List<ParsedSyllabusRow> rows = fileParser.parse(file);
        ValidationResult result = validate(rows);
        SyllabusImportPreviewResponse response = buildPreviewResponse(rows, result);
        return response;
    }

    @Override
    @Transactional
    public SyllabusImportResponse importSyllabus(Long courseId, MultipartFile file) {
        Course course = findCourseOrThrow(courseId);
        List<ParsedSyllabusRow> rows = fileParser.parse(file);
        ValidationResult result = validate(rows);
        if (!result.errors.isEmpty()) {
            // Throw with detailed errors so controller can return 400 with preview-like payload? For now throw BadRequest with message
            // But we want to return structured errors. Instead we throw BadRequestException with first error, but also we could throw custom. We'll throw BadRequestException with detailed message
            // The controller will handle conversion? Simpler: throw BadRequestException containing all errors serialized? We'll just throw and let GlobalExceptionHandler handle? Instead we should not throw generic but return error response? Spec says if errors -> Reject. So we throw.
            StringBuilder sb = new StringBuilder("Validation failed: ");
            for (SyllabusImportError e : result.errors) {
                sb.append(String.format("[Row %d: %s] ", e.getRowNumber(), e.getMessage()));
            }
            throw new BadRequestException(sb.toString());
        }

        // Build module grouping preserving order
        LinkedHashMap<String, List<ParsedSyllabusRow>> grouped = groupByModule(rows);
        int baseOrder = moduleRepository.countByCourseId(courseId);

        List<SyllabusModuleResponse> createdModules = new ArrayList<>();
        int moduleIdx = 0;
        int totalTopics = 0;

        for (Map.Entry<String, List<ParsedSyllabusRow>> entry : grouped.entrySet()) {
            String moduleTitle = entry.getKey();
            List<ParsedSyllabusRow> moduleRows = entry.getValue();
            ParsedSyllabusRow first = moduleRows.get(0);

            SyllabusModule module = new SyllabusModule();
            module.setCourse(course);
            module.setTitle(moduleTitle.trim());
            module.setDescription(emptyToNull(first.getModuleDescription()));
            Integer durVal = parseModuleDuration(first.getModuleDuration());
            module.setDurationValue(durVal);
            DurationUnit unit = parseDurationUnit(first.getDurationUnit());
            module.setDurationUnit(durVal != null ? (unit != null ? unit : DurationUnit.HOURS) : unit);
            CourseStatus mStatus = parseStatus(first.getModuleStatus());
            module.setStatus(mStatus != null ? mStatus : CourseStatus.PUBLISHED);
            module.setOrderIndex(baseOrder + moduleIdx);

            SyllabusModule saved = moduleRepository.save(module);

            // create topics in file order
            List<SyllabusTopic> savedTopics = new ArrayList<>();
            for (int ti = 0; ti < moduleRows.size(); ti++) {
                ParsedSyllabusRow r = moduleRows.get(ti);
                SyllabusTopic topic = new SyllabusTopic();
                topic.setModule(saved);
                topic.setTitle(r.getTopic().trim());
                topic.setDescription(emptyToNull(r.getTopicDescription()));
                Integer tdur = parseTopicDuration(r.getTopicDuration());
                topic.setDurationHours(tdur);
                CourseStatus tStatus = parseStatus(r.getTopicStatus());
                topic.setStatus(tStatus != null ? tStatus : CourseStatus.PUBLISHED);
                topic.setOrderIndex(ti);
                savedTopics.add(topicRepository.save(topic));
            }
            totalTopics += savedTopics.size();
            // Build response module with topics
            // Use SyllabusModuleResponse.from but need to convert topics
            List<com.careerlabs.lms.api.syllabus.dto.response.SyllabusTopicResponse> topicResponses = savedTopics.stream()
                    .map(com.careerlabs.lms.api.syllabus.dto.response.SyllabusTopicResponse::from)
                    .toList();
            createdModules.add(SyllabusModuleResponse.from(saved, topicResponses));
            moduleIdx++;
        }

        return new SyllabusImportResponse(grouped.size(), totalTopics, createdModules);
    }

    private ValidationResult validate(List<ParsedSyllabusRow> rows) {
        List<SyllabusImportError> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // First pass: per-row validation
        for (ParsedSyllabusRow r : rows) {
            // Module title
            String mod = r.getModule() != null ? r.getModule().trim() : "";
            if (mod.isEmpty()) {
                errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module", "Module title is required"));
            } else if (mod.length() > 200) {
                errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module", "Module title must be between 1 and 200 characters"));
            }

            // Topic title
            String topic = r.getTopic() != null ? r.getTopic().trim() : "";
            if (topic.isEmpty()) {
                errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic", "Topic title is required"));
            } else if (topic.length() > 200) {
                errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic", "Topic title must be between 1 and 200 characters"));
            }

            // Module duration
            String mDurStr = r.getModuleDuration() != null ? r.getModuleDuration().trim() : "";
            if (!mDurStr.isEmpty()) {
                if (!isValidIntegerString(mDurStr)) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module Duration", "Module duration must be a valid positive integer without decimals, signs, or exponents"));
                } else {
                    try {
                        int v = Integer.parseInt(mDurStr);
                        if (v <= 0) {
                            errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module Duration", "Module duration must be a positive integer"));
                        }
                    } catch (NumberFormatException e) {
                        errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module Duration", "Module duration must be a valid integer"));
                    }
                }
            }

            // Duration unit
            String unitStr = r.getDurationUnit() != null ? r.getDurationUnit().trim() : "";
            if (!unitStr.isEmpty()) {
                String u = unitStr.toUpperCase();
                if (!u.equals("HOURS") && !u.equals("DAYS") && !u.equals("WEEKS")) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Duration Unit", "Duration unit must be HOURS, DAYS, or WEEKS"));
                }
            }

            // Module status
            String mStatusStr = r.getModuleStatus() != null ? r.getModuleStatus().trim() : "";
            if (!mStatusStr.isEmpty()) {
                String s = mStatusStr.toUpperCase();
                if (!s.equals("PUBLISHED") && !s.equals("DRAFT")) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module Status", "Module status must be PUBLISHED or DRAFT"));
                }
            }

            // Topic duration
            String tDurStr = r.getTopicDuration() != null ? r.getTopicDuration().trim() : "";
            if (!tDurStr.isEmpty()) {
                if (!isValidIntegerString(tDurStr)) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic Duration", "Topic duration must be a valid positive integer without decimals, signs, or exponents"));
                } else {
                    try {
                        int v = Integer.parseInt(tDurStr);
                        if (v <= 0) {
                            errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic Duration", "Topic duration must be a positive integer"));
                        }
                    } catch (NumberFormatException e) {
                        errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic Duration", "Topic duration must be a valid integer"));
                    }
                }
            }

            // Topic status
            String tStatusStr = r.getTopicStatus() != null ? r.getTopicStatus().trim() : "";
            if (!tStatusStr.isEmpty()) {
                String s = tStatusStr.toUpperCase();
                if (!s.equals("PUBLISHED") && !s.equals("DRAFT")) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic Status", "Topic status must be PUBLISHED or DRAFT"));
                }
            }
        }

        // Second pass: cross-row validations
        // 1) Conflicting module metadata
        Map<String, ParsedSyllabusRow> firstOccurrence = new LinkedHashMap<>();
        for (ParsedSyllabusRow r : rows) {
            String modKey = r.getModule() != null ? r.getModule().trim() : "";
            if (modKey.isEmpty()) continue;
            // use exact trimmed name as key (case-sensitive per spec? preserve)
            if (!firstOccurrence.containsKey(modKey)) {
                firstOccurrence.put(modKey, r);
            } else {
                ParsedSyllabusRow first = firstOccurrence.get(modKey);
                // compare description
                String d1 = normalizeNullable(first.getModuleDescription());
                String d2 = normalizeNullable(r.getModuleDescription());
                if (!d1.equals(d2)) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module Description", "Conflicting module description for '" + modKey + "'. Expected '" + first.getModuleDescription() + "' but found '" + r.getModuleDescription() + "'"));
                }
                String dur1 = normalizeNullable(first.getModuleDuration());
                String dur2 = normalizeNullable(r.getModuleDuration());
                if (!dur1.equals(dur2)) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module Duration", "Conflicting module duration for '" + modKey + "'"));
                }
                String unit1 = normalizeNullable(first.getDurationUnit()).toUpperCase();
                String unit2 = normalizeNullable(r.getDurationUnit()).toUpperCase();
                if (!unit1.equals(unit2)) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Duration Unit", "Conflicting duration unit for '" + modKey + "'"));
                }
                String stat1 = normalizeNullable(first.getModuleStatus()).toUpperCase();
                String stat2 = normalizeNullable(r.getModuleStatus()).toUpperCase();
                // default status is PUBLISHED when omitted -> normalize empty to PUBLISHED for comparison?
                if (stat1.isEmpty()) stat1 = "PUBLISHED";
                if (stat2.isEmpty()) stat2 = "PUBLISHED";
                if (!stat1.equals(stat2)) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Module Status", "Conflicting module status for '" + modKey + "'"));
                }
            }
        }

        // 2) Duplicate topic within same module and duration checks
        // Group by module
        LinkedHashMap<String, List<ParsedSyllabusRow>> grouped = groupByModule(rows);
        for (Map.Entry<String, List<ParsedSyllabusRow>> entry : grouped.entrySet()) {
            String moduleName = entry.getKey();
            List<ParsedSyllabusRow> modRows = entry.getValue();
            // Duplicate topic check
            Set<String> seenTopics = new HashSet<>();
            for (ParsedSyllabusRow r : modRows) {
                String topic = r.getTopic() != null ? r.getTopic().trim() : "";
                if (topic.isEmpty()) continue;
                if (!seenTopics.add(topic)) {
                    errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic", "Duplicate topic title '" + topic + "' within module '" + moduleName + "'"));
                }
            }

            // Duration checks
            // Get module duration hours
            ParsedSyllabusRow first = modRows.get(0);
            Integer mDurVal = parseModuleDurationQuiet(first.getModuleDuration());
            DurationUnit unit = parseDurationUnitQuiet(first.getDurationUnit());
            Double moduleHours = null;
            if (mDurVal != null && mDurVal > 0) {
                double hours = toHours(mDurVal, unit);
                moduleHours = hours;
            }

            // If any topic has duration but module has no duration -> error per topic row
            for (ParsedSyllabusRow r : modRows) {
                Integer tDur = parseTopicDurationQuiet(r.getTopicDuration());
                if (tDur != null && tDur > 0) {
                    if (moduleHours == null) {
                        errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic Duration", "Topic has duration but parent module has no duration. Please set module duration."));
                    } else {
                        if (tDur > moduleHours) {
                            errors.add(new SyllabusImportError(r.getRowNumber(), r.getModule(), r.getTopic(), "Topic Duration", "Topic duration (" + tDur + "h) exceeds module duration (" + moduleHours.intValue() + "h)"));
                        }
                    }
                }
            }

            // Sum check
            if (moduleHours != null) {
                int sum = 0;
                for (ParsedSyllabusRow r : modRows) {
                    Integer tDur = parseTopicDurationQuiet(r.getTopicDuration());
                    if (tDur != null) sum += tDur;
                }
                if (sum > moduleHours) {
                    // Add error to last row of module? add generic error with module name
                    // We'll add error to each module's last row for visibility
                    ParsedSyllabusRow last = modRows.get(modRows.size() - 1);
                    errors.add(new SyllabusImportError(last.getRowNumber(), last.getModule(), last.getTopic(), "Topic Duration", "Total topic duration (" + sum + "h) exceeds module duration (" + moduleHours.intValue() + "h)"));
                }
            }
        }

        return new ValidationResult(errors, warnings);
    }

    private SyllabusImportPreviewResponse buildPreviewResponse(List<ParsedSyllabusRow> rows, ValidationResult result) {
        LinkedHashMap<String, List<ParsedSyllabusRow>> grouped = groupByModule(rows);
        List<SyllabusImportPreviewResponse.PreviewModule> previewModules = new ArrayList<>();
        int totalTopics = 0;
        int totalDurationHours = 0;

        for (Map.Entry<String, List<ParsedSyllabusRow>> entry : grouped.entrySet()) {
            List<ParsedSyllabusRow> modRows = entry.getValue();
            ParsedSyllabusRow first = modRows.get(0);
            SyllabusImportPreviewResponse.PreviewModule pm = new SyllabusImportPreviewResponse.PreviewModule();
            pm.setTitle(first.getModule().trim());
            pm.setDescription(first.getModuleDescription() != null ? first.getModuleDescription().trim() : null);
            if (pm.getDescription() != null && pm.getDescription().isEmpty()) pm.setDescription(null);
            Integer durVal = parseModuleDurationQuiet(first.getModuleDuration());
            pm.setDurationValue(durVal);
            String unitRaw = first.getDurationUnit() != null ? first.getDurationUnit().trim().toUpperCase() : null;
            if (unitRaw != null && unitRaw.isEmpty()) unitRaw = null;
            pm.setDurationUnit(unitRaw);
            String statusRaw = first.getModuleStatus() != null ? first.getModuleStatus().trim().toUpperCase() : null;
            if (statusRaw == null || statusRaw.isEmpty()) statusRaw = "PUBLISHED";
            pm.setStatus(statusRaw);

            // calculate module hours for total
            if (durVal != null) {
                DurationUnit u = parseDurationUnitQuiet(first.getDurationUnit());
                int h = (int) toHours(durVal, u);
                pm.setTotalDurationHours(h);
                totalDurationHours += h;
            }

            List<SyllabusImportPreviewResponse.PreviewTopic> pTopics = new ArrayList<>();
            for (ParsedSyllabusRow r : modRows) {
                SyllabusImportPreviewResponse.PreviewTopic pt = new SyllabusImportPreviewResponse.PreviewTopic();
                pt.setTitle(r.getTopic() != null ? r.getTopic().trim() : "");
                pt.setDescription(r.getTopicDescription() != null ? r.getTopicDescription().trim() : null);
                if (pt.getDescription() != null && pt.getDescription().isEmpty()) pt.setDescription(null);
                Integer tdur = parseTopicDurationQuiet(r.getTopicDuration());
                pt.setDurationHours(tdur);
                String tStatus = r.getTopicStatus() != null ? r.getTopicStatus().trim().toUpperCase() : null;
                if (tStatus == null || tStatus.isEmpty()) tStatus = "PUBLISHED";
                pt.setStatus(tStatus);
                pt.setRowNumber(r.getRowNumber());
                pTopics.add(pt);
            }
            pm.setTopics(pTopics);
            totalTopics += pTopics.size();
            previewModules.add(pm);
        }

        SyllabusImportPreviewResponse resp = new SyllabusImportPreviewResponse();
        resp.setValid(result.errors.isEmpty());
        resp.setTotalModules(previewModules.size());
        resp.setTotalTopics(totalTopics);
        resp.setTotalDurationHours(totalDurationHours);
        resp.setErrors(result.errors);
        resp.setWarnings(result.warnings);
        resp.setModules(previewModules);
        return resp;
    }

    private LinkedHashMap<String, List<ParsedSyllabusRow>> groupByModule(List<ParsedSyllabusRow> rows) {
        LinkedHashMap<String, List<ParsedSyllabusRow>> map = new LinkedHashMap<>();
        for (ParsedSyllabusRow r : rows) {
            String key = r.getModule() != null ? r.getModule().trim() : "";
            if (key.isEmpty()) continue; // blank modules already errored, skip grouping
            map.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
        }
        return map;
    }

    private Course findCourseOrThrow(Long id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found: " + id));
    }

    private String normalizeNullable(String s) {
        return s == null ? "" : s.trim();
    }

    private String emptyToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static boolean isValidIntegerString(String s) {
        if (s == null) return false;
        String t = s.trim();
        if (t.isEmpty()) return false;
        // Reject exponent notation, leading +, leading -, decimal points
        if (t.matches(".*[eE].*") || t.startsWith("+") || t.startsWith("-") || t.contains(".")) {
            return false;
        }
        return t.matches("^[1-9]\\d*$");
    }

    private Integer parseModuleDuration(String s) {
        if (!isValidIntegerString(s)) throw new NumberFormatException("Not a valid integer");
        return Integer.parseInt(s.trim());
    }

    private Integer parseModuleDurationQuiet(String s) {
        if (!isValidIntegerString(s)) return null;
        return Integer.parseInt(s.trim());
    }

    private Integer parseTopicDuration(String s) {
        if (!isValidIntegerString(s)) throw new NumberFormatException("Not a valid integer");
        return Integer.parseInt(s.trim());
    }

    private Integer parseTopicDurationQuiet(String s) {
        if (!isValidIntegerString(s)) return null;
        return Integer.parseInt(s.trim());
    }

    private DurationUnit parseDurationUnit(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        return DurationUnit.valueOf(s.trim().toUpperCase());
    }

    private DurationUnit parseDurationUnitQuiet(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        try { return DurationUnit.valueOf(s.trim().toUpperCase()); } catch (Exception e) { return null; }
    }

    private CourseStatus parseStatus(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        try { return CourseStatus.valueOf(s.trim().toUpperCase()); } catch (Exception e) { return null; }
    }

    private double toHours(int value, DurationUnit unit) {
        if (unit == null) unit = DurationUnit.HOURS;
        switch (unit) {
            case HOURS: return value;
            case DAYS: return value * 24.0;
            case WEEKS: return value * 7.0 * 24.0;
            default: return value;
        }
    }

    private static class ValidationResult {
        final List<SyllabusImportError> errors;
        final List<String> warnings;
        ValidationResult(List<SyllabusImportError> errors, List<String> warnings) {
            this.errors = errors;
            this.warnings = warnings;
        }
    }
}
