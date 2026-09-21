package com.careerlabs.lms.api.user.service;

import com.careerlabs.lms.api.common.dto.response.BulkImportResponse;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.user.dto.request.AdminCreateRequest;
import com.careerlabs.lms.api.user.dto.request.AdminUpdateRequest;
import com.careerlabs.lms.api.user.dto.response.AdminPageResponse;
import com.careerlabs.lms.api.user.dto.response.AdminResponse;
import org.springframework.web.multipart.MultipartFile;

public interface UserAdminService {

    AdminPageResponse listAdmins(String search, String status, int page, int limit);

    AdminResponse getAdmin(Long adminId);

    AdminResponse createAdmin(AdminCreateRequest request);

    BulkImportResponse<AdminResponse> bulkImportAdmins(MultipartFile file, String defaultPassword);

    AdminResponse updateAdmin(Long adminId, AdminUpdateRequest request);

    AdminResponse toggleAdminStatus(Long adminId, JwtUserPrincipal principal);

    void deleteAdmin(Long adminId, JwtUserPrincipal principal);

    void resetPassword(JwtUserPrincipal principal, Long targetUserId, String newPassword);
}
