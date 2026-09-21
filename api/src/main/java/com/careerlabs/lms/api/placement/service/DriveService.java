package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.request.CreateDriveRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateDriveRequest;
import com.careerlabs.lms.api.placement.dto.response.AdminDriveResponse;
import com.careerlabs.lms.api.placement.dto.response.DrivePageResponse;
import com.careerlabs.lms.api.placement.dto.response.StudentDrivePageResponse;
import com.careerlabs.lms.api.placement.dto.response.StudentDriveResponse;

import java.util.List;

public interface DriveService {

    List<AdminDriveResponse> listForAdmin();

    DrivePageResponse pageForAdmin(String search, String status, int page, int limit);

    AdminDriveResponse get(Long id);

    AdminDriveResponse create(CreateDriveRequest request, Long adminUserId);

    AdminDriveResponse update(Long id, UpdateDriveRequest request);

    void delete(Long id);

    List<StudentDriveResponse> listForStudent(Long userId);

    StudentDrivePageResponse pageForStudent(Long userId, String search, String status, int page, int limit);
}
