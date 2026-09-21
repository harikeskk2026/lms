package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.request.CompleteInterviewRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateEvaluationRequest;
import com.careerlabs.lms.api.placement.dto.request.CreateInterviewRoundRequest;
import com.careerlabs.lms.api.placement.dto.request.ScheduleInterviewRequest;
import com.careerlabs.lms.api.placement.dto.response.InterviewEvaluationResponse;
import com.careerlabs.lms.api.placement.dto.response.InterviewRoundResponse;
import com.careerlabs.lms.api.placement.dto.response.PlacementInterviewPageResponse;
import com.careerlabs.lms.api.placement.dto.response.PlacementInterviewResponse;

import java.util.List;

public interface PlacementInterviewService {

    // Rounds
    InterviewRoundResponse createRound(Long driveId, CreateInterviewRoundRequest request, Long adminUserId);
    List<InterviewRoundResponse> listRounds(Long driveId);
    void deleteRound(Long driveId, Long roundId, Long adminUserId);

    // Interviews
    PlacementInterviewResponse schedule(Long driveId, ScheduleInterviewRequest request, Long adminUserId);
    List<PlacementInterviewResponse> listForDrive(Long driveId);
    List<PlacementInterviewResponse> listForStudent(Long studentUserId);
    PlacementInterviewPageResponse pageForStudent(Long studentUserId, String search, int page, int limit);
    PlacementInterviewPageResponse pageForDrive(Long driveId, String search, String status, int page, int limit);
    PlacementInterviewResponse complete(Long driveId, Long interviewId, CompleteInterviewRequest request, Long adminUserId);

    // Evaluations
    InterviewEvaluationResponse evaluate(Long driveId, CreateEvaluationRequest request, Long adminUserId);
    List<InterviewEvaluationResponse> listEvaluations(Long driveId, Long interviewId);
}