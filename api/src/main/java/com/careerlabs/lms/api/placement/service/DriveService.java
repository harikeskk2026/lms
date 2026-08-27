package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.request.CreateDriveRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateDriveRequest;
import com.careerlabs.lms.api.placement.dto.request.UpdateDriveStatusRequest;
import com.careerlabs.lms.api.placement.dto.response.AdminDriveResponse;
import com.careerlabs.lms.api.placement.dto.response.StudentDriveResponse;

import java.util.List;

public interface DriveService {

    List<AdminDriveResponse> listForAdmin();

    AdminDriveResponse get(Long id);

    AdminDriveResponse create(CreateDriveRequest request, Long adminUserId);

    AdminDriveResponse update(Long id, UpdateDriveRequest request);

    AdminDriveResponse updateStatus(Long id, UpdateDriveStatusRequest request);

    List<StudentDriveResponse> listForStudent(Long userId);
}
