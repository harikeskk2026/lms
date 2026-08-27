package com.careerlabs.lms.api.placement.service;

import com.careerlabs.lms.api.placement.dto.response.DriveApplicationResponse;

public interface DriveApplicationService {

    DriveApplicationResponse expressInterest(Long driveId, Long userId);
}
