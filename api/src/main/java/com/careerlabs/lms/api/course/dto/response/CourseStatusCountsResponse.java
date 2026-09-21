package com.careerlabs.lms.api.course.dto.response;

public record CourseStatusCountsResponse(long published, long draft, long archived, long total) {

    public static CourseStatusCountsResponse of(long published, long draft, long archived) {
        return new CourseStatusCountsResponse(published, draft, archived, published + draft + archived);
    }
}