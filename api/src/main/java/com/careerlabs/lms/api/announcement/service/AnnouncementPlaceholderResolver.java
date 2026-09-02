package com.careerlabs.lms.api.announcement.service;

import com.careerlabs.lms.api.attendance.repository.AttendanceRepository;
import com.careerlabs.lms.api.attendance.entity.AttendStatus;
import com.careerlabs.lms.api.student.entity.Student;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Resolves {{placeholder}} tokens in announcement title/body text. Pure string substitution, no AI involved. */
@Component
public class AnnouncementPlaceholderResolver {

    private static final Pattern TOKEN = Pattern.compile("\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    private final AttendanceRepository attendanceRepository;

    public AnnouncementPlaceholderResolver(AttendanceRepository attendanceRepository) {
        this.attendanceRepository = attendanceRepository;
    }

    /** Generic substitution using an explicit variable map (used for admin template application). */
    public String resolve(String text, Map<String, String> variables) {
        if (text == null || variables == null || variables.isEmpty()) {
            return text;
        }
        Matcher matcher = TOKEN.matcher(text);
        StringBuilder out = new StringBuilder();
        while (matcher.find()) {
            String key = matcher.group(1);
            String value = variables.get(key);
            matcher.appendReplacement(out, Matcher.quoteReplacement(value != null ? value : matcher.group(0)));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    /** Builds the auto-fillable variables for a specific student, used to personalize their announcement feed. */
    public Map<String, String> variablesFor(Student student) {
        Map<String, String> vars = new HashMap<>();
        vars.put("studentName", student.getUser() != null ? student.getUser().getName() : "");
        vars.put("batchName", student.getBatch() != null ? student.getBatch().getName() : "");
        vars.put("courseName", student.getCourse() != null ? student.getCourse().getTitle() : "");
        vars.put("date", LocalDate.now().format(DATE_FORMAT));

        long total = attendanceRepository.countByStudentId(student.getId());
        if (total > 0) {
            long present = attendanceRepository.countByStudentIdAndStatus(student.getId(), AttendStatus.PRESENT);
            vars.put("attendancePercentage", String.valueOf(Math.round(present * 100.0 / total)));
        } else {
            vars.put("attendancePercentage", "N/A");
        }
        return vars;
    }

    /** Fixed mock values so an admin can preview how placeholders resolve without a real student. */
    public Map<String, String> sampleVariables() {
        Map<String, String> vars = new HashMap<>();
        vars.put("studentName", "Jane Student");
        vars.put("batchName", "Demo Batch");
        vars.put("courseName", "Sample Course");
        vars.put("attendancePercentage", "82");
        vars.put("date", LocalDate.now().format(DATE_FORMAT));
        return vars;
    }
}
