package com.careerlabs.lms.api.enrollment.service.impl;

import com.careerlabs.lms.api.enrollment.dto.response.EnrollmentContactResponse;
import com.careerlabs.lms.api.enrollment.service.EnrollmentContactService;
import com.careerlabs.lms.api.user.entity.Role;
import com.careerlabs.lms.api.user.entity.User;
import com.careerlabs.lms.api.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class EnrollmentContactServiceImpl implements EnrollmentContactService {

    private static final List<Role> STAFF_ROLES = List.of(Role.ADMIN, Role.SUPERADMIN, Role.TRAINER);

    private final UserRepository userRepository;

    public EnrollmentContactServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public EnrollmentContactResponse getContactInfo() {
        List<User> staff = userRepository.findByActiveTrueAndRoleInOrderByCreatedAtAsc(STAFF_ROLES);

        User contact = staff.stream()
                .filter(u -> isTrainingCoordinator(u))
                .findFirst()
                .orElse(staff.stream()
                        .filter(u -> u.getRole() == Role.ADMIN || u.getRole() == Role.SUPERADMIN)
                        .findFirst()
                        .orElse(staff.isEmpty() ? null : staff.get(0)));

        if (contact == null) {
            return new EnrollmentContactResponse(null, null, null, null);
        }
        return new EnrollmentContactResponse(
                contact.getName(),
                contact.getEmail(),
                contact.getPhone(),
                contact.getDesignation());
    }

    private boolean isTrainingCoordinator(User user) {
        return user.getDesignation() != null
                && user.getDesignation().toLowerCase(Locale.ROOT).contains("coordinator");
    }
}