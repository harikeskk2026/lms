package com.careerlabs.lms.api.academic.dto.response;

import com.careerlabs.lms.api.academic.entity.AcademicDetails;
import com.careerlabs.lms.api.student.entity.AcademicScoreType;

public record AcademicDetailsResponse(
        Long studentId,
        Integer tenthYearOfPassing,
        Double tenthPercentage,
        Integer twelfthYearOfPassing,
        Double twelfthPercentage,
        Integer diplomaYearOfPassing,
        Double diplomaPercentage,
        String ugDegree,
        String ugDepartment,
        Integer ugYearOfPassing,
        AcademicScoreType ugScoreType,
        Double ugScore,
        Integer ugBacklogs,
        String pgDegree,
        String pgDepartment,
        Integer pgYearOfPassing,
        AcademicScoreType pgScoreType,
        Double pgScore,
        Integer pgBacklogs
) {

    public static AcademicDetailsResponse from(Long studentId, AcademicDetails details) {
        if (details == null) {
            return new AcademicDetailsResponse(studentId, null, null, null, null, null, null,
                    null, null, null, null, null, null,
                    null, null, null, null, null, null);
        }
        return new AcademicDetailsResponse(
                studentId,
                details.getTenthYearOfPassing(),
                details.getTenthPercentage(),
                details.getTwelfthYearOfPassing(),
                details.getTwelfthPercentage(),
                details.getDiplomaYearOfPassing(),
                details.getDiplomaPercentage(),
                details.getUgDegree(),
                details.getUgDepartment(),
                details.getUgYearOfPassing(),
                details.getUgScoreType(),
                details.getUgScore(),
                details.getUgBacklogs(),
                details.getPgDegree(),
                details.getPgDepartment(),
                details.getPgYearOfPassing(),
                details.getPgScoreType(),
                details.getPgScore(),
                details.getPgBacklogs());
    }
}
