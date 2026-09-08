package com.careerlabs.lms.api.user.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.security.JwtUserPrincipal;
import com.careerlabs.lms.api.security.TokenRevocationService;
import com.careerlabs.lms.api.user.dto.request.AdminCreateRequest;
import com.careerlabs.lms.api.user.dto.response.AdminPageResponse;
import com.careerlabs.lms.api.user.dto.response.AdminResponse;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import com.careerlabs.lms.api.user.service.UserAdminService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class UserAdminServiceImpl implements UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenRevocationService tokenRevocationService;

    public UserAdminServiceImpl(UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                TokenRevocationService tokenRevocationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenRevocationService = tokenRevocationService;
    }

    @Override
    @Transactional(readOnly = true)
    public AdminPageResponse listAdmins(String search, String status, int page, int limit) {
        Pageable pageable = PageRequest.of(Math.max(0, page - 1), limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("role"), Role.ADMIN));
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern)
                ));
            }
            if ("active".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("active"), true));
            } else if ("inactive".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(root.get("active"), false));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<User> userPage = userRepository.findAll(spec, pageable);
        List<AdminResponse> admins = userPage.getContent().stream().map(AdminResponse::from).toList();
        return new AdminPageResponse(admins, userPage.getTotalElements(), userPage.getTotalPages(), userPage.getNumber() + 1);
    }

    @Override
    @Transactional
    public AdminResponse createAdmin(AdminCreateRequest request) {
        if (userRepository.findByEmailIgnoreCase(request.getEmail()).isPresent()) {
            throw new ConflictException("User already exists with email: " + request.getEmail());
        }
        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.ADMIN);
        user.setActive(true);
        user.setPhone(request.getPhone());
        user.setDesignation(request.getDesignation());
        user.setDepartment(request.getDepartment());
        User saved = userRepository.save(user);
        return AdminResponse.from(saved);
    }

    @Override
    @Transactional
    public AdminResponse toggleAdminStatus(Long adminId, JwtUserPrincipal principal) {
        if (principal.id().equals(adminId)) {
            throw new BadRequestException("You cannot deactivate your own account");
        }
        User user = userRepository.findById(adminId)
                .filter(u -> u.getRole() == Role.ADMIN)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));
        user.setActive(!user.isActive());
        User saved = userRepository.save(user);
        if (!saved.isActive()) {
            tokenRevocationService.revokeAllUserTokens(saved.getId());
        }
        return AdminResponse.from(saved);
    }

    @Override
    @Transactional
    public void resetPassword(JwtUserPrincipal principal, Long targetUserId, String newPassword) {
        if (principal.id().equals(targetUserId)) {
            throw new BadRequestException("You cannot reset your own password via this endpoint. Use Profile to change your own password.");
        }
        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + targetUserId));

        Role requesterRole = Role.valueOf(principal.role());
        Role targetRole = target.getRole();

        if (requesterRole == Role.ADMIN) {
            if (targetRole != Role.TRAINER && targetRole != Role.STUDENT) {
                throw new ForbiddenException("ADMIN can only reset passwords for TRAINER and STUDENT accounts.");
            }
        } else if (requesterRole == Role.SUPERADMIN) {
            if (targetRole != Role.ADMIN && targetRole != Role.TRAINER && targetRole != Role.STUDENT) {
                throw new ForbiddenException("SUPERADMIN can only reset passwords for ADMIN, TRAINER and STUDENT accounts.");
            }
            if (targetRole == Role.SUPERADMIN) {
                throw new ForbiddenException("Cannot reset another SUPERADMIN's password via this endpoint.");
            }
        } else {
            throw new ForbiddenException("You do not have permission to reset passwords.");
        }

        target.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(target);
        tokenRevocationService.revokeAllUserTokens(targetUserId);
    }
}
