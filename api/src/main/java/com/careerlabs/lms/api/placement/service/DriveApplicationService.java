package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.response.AdminDriveApplicationResponse;
import com.careerlabs.lms.api.placement.dto.response.DriveApplicationResponse;
import com.careerlabs.lms.api.placement.dto.response.DriveApplicationStatusHistoryResponse;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;

import java.util.List;

public interface DriveApplicationService {

    DriveApplicationResponse expressInterest(Long driveId, Long userId);
    DriveApplicationResponse withdraw(Long driveId, Long userId);

    List<AdminDriveApplicationResponse> listForDrive(Long driveId);

    AdminDriveApplicationResponse updateStatus(Long driveId, Long applicationId, DriveApplicationStatus newStatus,
                                                String note, Long adminUserId);

    List<DriveApplicationStatusHistoryResponse> getStatusHistory(Long driveId, Long applicationId);
}
