package com.careerlabs.lms.api.batch.service;

import com.careerlabs.lms.api.batch.entity.Batch;
import com.careerlabs.lms.api.batch.repository.BatchRepository;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import org.springframework.stereotype.Component;

/**
 * Central authorization guard for trainer-based batch ownership.
 * Used by Meeting and Attendance services to enforce that trainers
 * can only access/modify data belonging to their assigned batches.
 */
@Component
public class BatchAuthorizationGuard {

    private final BatchRepository batchRepository;

    public BatchAuthorizationGuard(BatchRepository batchRepository) {
        this.batchRepository = batchRepository;
    }

    public boolean isAdmin(JwtUserPrincipal principal) {
        if (principal == null || principal.role() == null) return false;
        String role = principal.role().toUpperCase();
        return "ADMIN".equals(role) || "SUPERADMIN".equals(role) || "ROLE_ADMIN".equals(role) || "ROLE_SUPERADMIN".equals(role) || "SUPER_ADMIN".equals(role);
    }

    public boolean isTrainer(JwtUserPrincipal principal) {
        if (principal == null || principal.role() == null) return false;
        String role = principal.role().toUpperCase();
        return "TRAINER".equals(role) || "ROLE_TRAINER".equals(role);
    }

    /**
     * Verify the batch exists and belongs to the trainer.
     * Admins/SuperAdmins always pass.
     * TRAINER must be one of the batch's assigned trainers (batch.trainers contains principal.id()).
     * Throws ForbiddenException if not authorized.
     */
    public Batch requireBatchOwnership(JwtUserPrincipal principal, Long batchId) {
        if (batchId == null) {
            throw new ForbiddenException("Batch ID is required");
        }
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new com.careerlabs.lms.api.common.exception.ResourceNotFoundException("Batch not found with id: " + batchId));

        if (principal == null || isAdmin(principal)) {
            return batch;
        }

        if (isTrainer(principal)) {
            if (!batch.hasTrainer(principal.id())) {
                throw new ForbiddenException("You are not assigned to this batch");
            }
            return batch;
        }

        throw new ForbiddenException("You are not authorized to perform this action");
    }

    /**
     * Verify an existing entity (DailyClass or MeetingLink) belongs to a batch
     * assigned to the trainer. Admins always pass.
     */
    public void requireEntityBatchOwnership(JwtUserPrincipal principal, Long batchId) {
        if (principal == null || isAdmin(principal)) {
            return;
        }
        if (batchId == null) {
            return;
        }
        requireBatchOwnership(principal, batchId);
    }

    /**
     * If batchId is provided, verify it belongs to the trainer.
     * If batchId is null and caller is trainer, this is a no-op (listing all).
     * Returns true if the batchId is valid for the trainer.
     */
    public boolean isValidBatchFilter(JwtUserPrincipal principal, Long batchId) {
        if (batchId == null) return true;
        if (isAdmin(principal)) return true;
        if (!isTrainer(principal)) return false;
        return batchRepository.findById(batchId)
                .map(b -> b.hasTrainer(principal.id()))
                .orElse(false);
    }

    /**
     * Check if caller has permission to view unmasked meeting passcode.
     * Admins and SuperAdmins always can.
     * Trainers can only view if they created the meeting or are assigned to the batch.
     */
    public boolean canViewPasscode(JwtUserPrincipal principal, Long batchId, Long createdBy) {
        if (principal == null || isAdmin(principal)) return true;
        if (!isTrainer(principal)) return false;
        if (createdBy != null && createdBy.equals(principal.id())) return true;
        if (batchId != null) {
            return batchRepository.findById(batchId)
                    .map(b -> b.hasTrainer(principal.id()))
                    .orElse(false);
        }
        return false;
    }
}
