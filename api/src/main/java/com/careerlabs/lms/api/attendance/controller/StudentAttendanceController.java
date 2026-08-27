package com.careerlabs.lms.api.attendance.controller;

import com.careerlabs.lms.api.attendance.dto.AttendanceAnalyticsResponse;
import com.careerlabs.lms.api.attendance.dto.AttendanceHistoryResponse;
import com.careerlabs.lms.api.attendance.dto.DailyClassResponse;
import com.careerlabs.lms.api.attendance.dto.StudentAttendanceSummaryResponse;
import com.careerlabs.lms.api.attendance.dto.request.AttendanceCorrectionRequest;
import com.careerlabs.lms.api.attendance.dto.request.AttendanceGoalRequest;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCalendarDayResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceCorrectionResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceGoalResponse;
import com.careerlabs.lms.api.attendance.dto.response.AttendanceHealthResponse;
import com.careerlabs.lms.api.attendance.entity.ClassStatus;
import com.careerlabs.lms.api.attendance.service.AttendanceCorrectionService;
import com.careerlabs.lms.api.attendance.service.AttendanceGoalService;
import com.careerlabs.lms.api.attendance.service.AttendanceRiskService;
import com.careerlabs.lms.api.attendance.service.AttendanceService;
import com.careerlabs.lms.api.common.response.ApiResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/student")
public class StudentAttendanceController {

    private final AttendanceService attendanceService;
    private final StudentRepository studentRepository;
    private final AttendanceRiskService attendanceRiskService;
    private final AttendanceGoalService attendanceGoalService;
    private final AttendanceCorrectionService attendanceCorrectionService;

    public StudentAttendanceController(
            AttendanceService attendanceService,
            StudentRepository studentRepository,
            AttendanceRiskService attendanceRiskService,
            AttendanceGoalService attendanceGoalService,
            AttendanceCorrectionService attendanceCorrectionService) {
        this.attendanceService = attendanceService;
        this.studentRepository = studentRepository;
        this.attendanceRiskService = attendanceRiskService;
        this.attendanceGoalService = attendanceGoalService;
        this.attendanceCorrectionService = attendanceCorrectionService;
    }

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<DailyClassResponse>>> getStudentClasses(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(required = false) ClassStatus status) {
        Student student = studentRepository.findByUserId(principal.id()).orElse(null);
        Long batchId = student != null && student.getBatch() != null ? student.getBatch().getId() : null;
        List<DailyClassResponse> response = attendanceService.getClasses(batchId, null, status);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance")
    public ResponseEntity<ApiResponse<List<AttendanceHistoryResponse.RecentRecordDto>>> getAttendance(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam(required = false) String month) {
        List<AttendanceHistoryResponse.RecentRecordDto> response = attendanceService.getStudentAttendanceRecords(principal.id(), month);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance/summary")
    public ResponseEntity<ApiResponse<StudentAttendanceSummaryResponse>> getAttendanceSummary(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        StudentAttendanceSummaryResponse response = attendanceService.getStudentAttendanceSummary(principal.id());
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance/trend")
    public ResponseEntity<ApiResponse<List<AttendanceAnalyticsResponse.DailyTrendPoint>>> getAttendanceTrend(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        List<AttendanceAnalyticsResponse.DailyTrendPoint> response = attendanceService.getStudentAttendanceTrend(principal.id());
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance/health")
    public ResponseEntity<ApiResponse<AttendanceHealthResponse>> getHealth(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(attendanceRiskService.getHealth(principal.id())));
    }

    @GetMapping("/attendance/goal")
    public ResponseEntity<ApiResponse<AttendanceGoalResponse>> getGoal(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(attendanceGoalService.getGoal(principal.id())));
    }

    @PostMapping("/attendance/goal")
    public ResponseEntity<ApiResponse<AttendanceGoalResponse>> setGoal(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody AttendanceGoalRequest request) {
        AttendanceGoalResponse response = attendanceGoalService.setGoal(principal.id(), request.getTargetPercentage());
        return ResponseEntity.ok(ApiResponse.of("Goal saved", response));
    }

    @GetMapping("/attendance/calendar/day")
    public ResponseEntity<ApiResponse<List<AttendanceCalendarDayResponse>>> getCalendarDay(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<AttendanceCalendarDayResponse> response = attendanceService.getCalendarDay(principal.id(), date);
        return ResponseEntity.ok(ApiResponse.of(response));
    }

    @GetMapping("/attendance/corrections")
    public ResponseEntity<ApiResponse<List<AttendanceCorrectionResponse>>> getCorrections(
            @AuthenticationPrincipal JwtUserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.of(attendanceCorrectionService.listForStudent(principal.id())));
    }

    @PostMapping("/attendance/corrections")
    public ResponseEntity<ApiResponse<AttendanceCorrectionResponse>> createCorrection(
            @AuthenticationPrincipal JwtUserPrincipal principal,
            @Valid @RequestBody AttendanceCorrectionRequest request) {
        AttendanceCorrectionResponse response = attendanceCorrectionService.create(principal.id(), request);
        return ResponseEntity.status(201).body(ApiResponse.of("Correction request submitted", response));
    }
}
