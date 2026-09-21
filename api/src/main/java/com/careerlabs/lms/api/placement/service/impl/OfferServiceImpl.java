package com.careerlabs.lms.api.placement.service.impl;

import com.careerlabs.lms.api.common.exception.BadRequestException;
import com.careerlabs.lms.api.common.exception.ConflictException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.notification.entity.NotificationType;
import com.careerlabs.lms.api.notification.service.NotificationService;
import com.careerlabs.lms.api.placement.dto.request.CreateOfferRequest;
import com.careerlabs.lms.api.placement.dto.response.OfferPageResponse;
import com.careerlabs.lms.api.placement.dto.response.OfferResponse;
import com.careerlabs.lms.api.placement.entity.Drive;
import com.careerlabs.lms.api.placement.entity.DriveApplication;
import com.careerlabs.lms.api.placement.entity.DriveApplicationStatus;
import com.careerlabs.lms.api.placement.entity.Offer;
import com.careerlabs.lms.api.placement.entity.OfferStatus;
import com.careerlabs.lms.api.placement.repository.DriveApplicationRepository;
import com.careerlabs.lms.api.placement.repository.OfferRepository;
import com.careerlabs.lms.api.placement.service.OfferService;
import com.careerlabs.lms.api.placement.service.PlacementService;
import com.careerlabs.lms.api.student.entity.Student;
import com.careerlabs.lms.api.student.repository.StudentRepository;
import com.careerlabs.lms.api.user.entity.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class OfferServiceImpl implements OfferService {

    private final OfferRepository offerRepository;
    private final DriveApplicationRepository driveApplicationRepository;
    private final StudentRepository studentRepository;
    private final PlacementService placementService;
    private final NotificationService notificationService;

    public OfferServiceImpl(OfferRepository offerRepository,
                            DriveApplicationRepository driveApplicationRepository,
                            StudentRepository studentRepository,
                            PlacementService placementService,
                            NotificationService notificationService) {
        this.offerRepository = offerRepository;
        this.driveApplicationRepository = driveApplicationRepository;
        this.studentRepository = studentRepository;
        this.placementService = placementService;
        this.notificationService = notificationService;
    }

    @Override
    @Transactional
    public OfferResponse issueOffer(CreateOfferRequest request, Long adminUserId) {
        DriveApplication application = driveApplicationRepository.findById(request.applicationId())
                .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + request.applicationId()));

        if (application.getStatus() != DriveApplicationStatus.SELECTED) {
            throw new BadRequestException("An offer can only be issued after the candidate is SELECTED (current status: "
                    + application.getStatus() + ")");
        }

        if (offerRepository.existsByApplication_IdAndStatus(application.getId(), OfferStatus.OFFERED)) {
            throw new ConflictException("An active offer already exists for this application");
        }

        Offer offer = new Offer();
        offer.setStudent(application.getStudent());
        offer.setDrive(application.getDrive());
        offer.setApplication(application);
        offer.setRole(request.role());
        offer.setCtc(request.ctc());
        offer.setJoiningDate(request.joiningDate());
        offer.setOfferExpiry(request.offerExpiry());
        offer.setOfferLetterUrl(request.offerLetterUrl());
        offer.setOfferDate(LocalDate.now());
        offer.setOfferNumber(generateOfferNumber());
        offer.setCreatedBy(adminUserId);
        offer.setStatus(OfferStatus.OFFERED);
        offer = offerRepository.save(offer);

        notificationService.notifyUser(application.getStudent().getUser().getId(),
                "📄 Offer Released",
                "Congratulations! " + application.getDrive().getCompanyName() + " has offered you the "
                        + request.role() + " role. Review and accept before the deadline.",
                NotificationType.SUCCESS, "/student/offers");

        return OfferResponse.from(offer);
    }

    @Override
    @Transactional
    public OfferResponse acceptOffer(Long offerId, Long studentUserId) {
        Offer offer = requireOwnedOffer(offerId, studentUserId);

        if (offer.getStatus() != OfferStatus.OFFERED) {
            throw new BadRequestException("Only an OFFERED offer can be accepted (current status: " + offer.getStatus() + ")");
        }
        if (offer.getOfferExpiry() != null && LocalDate.now().isAfter(offer.getOfferExpiry())) {
            offer.setStatus(OfferStatus.EXPIRED);
            offerRepository.save(offer);
            throw new BadRequestException("This offer has expired");
        }

        offer.setStatus(OfferStatus.ACCEPTED);
        offer.setAcceptedAt(Instant.now());
        offerRepository.save(offer);

        DriveApplication application = offer.getApplication();
        application.setStatus(DriveApplicationStatus.ACCEPTED);
        driveApplicationRepository.save(application);

        placementService.createFromOffer(offer, offer.getCreatedBy());

        return OfferResponse.from(offer);
    }

    @Override
    @Transactional
    public OfferResponse rejectOffer(Long offerId, Long studentUserId) {
        Offer offer = requireOwnedOffer(offerId, studentUserId);

        if (offer.getStatus() != OfferStatus.OFFERED) {
            throw new BadRequestException("Only an OFFERED offer can be rejected (current status: " + offer.getStatus() + ")");
        }

        offer.setStatus(OfferStatus.REJECTED);
        offer = offerRepository.save(offer);

        notificationService.notifyAdmins(
                "Offer Rejected",
                offer.getStudent().getUser().getName() + " declined the offer from "
                        + offer.getDrive().getCompanyName() + " (" + offer.getRole() + ").",
                NotificationType.WARNING, "/admin/offers");

        return OfferResponse.from(offer);
    }

    @Override
    @Transactional
    public OfferResponse withdrawOffer(Long offerId, Long adminUserId) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found: " + offerId));

        if (offer.getStatus() != OfferStatus.OFFERED) {
            throw new BadRequestException("Only an OFFERED offer can be withdrawn (current status: " + offer.getStatus() + ")");
        }

        offer.setStatus(OfferStatus.WITHDRAWN);
        offer = offerRepository.save(offer);

        notificationService.notifyUser(offer.getStudent().getUser().getId(),
                "Offer Withdrawn",
                "The offer from " + offer.getDrive().getCompanyName() + " (" + offer.getRole() + ") has been withdrawn.",
                NotificationType.WARNING, "/student/offers");

        return OfferResponse.from(offer);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferResponse> listForStudent(Long studentUserId) {
        Student student = requireStudent(studentUserId);
        return offerRepository.findByStudent_IdOrderByCreatedAtDesc(student.getId()).stream()
                .map(OfferResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OfferPageResponse pageForStudent(Long studentUserId, String search, int page, int limit) {
        Student student = requireStudent(studentUserId);
        String q = search == null ? "" : search.trim().toLowerCase();
        List<Offer> filtered = offerRepository.findByStudent_IdOrderByCreatedAtDesc(student.getId()).stream()
                .filter(offer -> {
                    if (q.isEmpty()) {
                        return true;
                    }
                    String company = offer.getDrive() != null && offer.getDrive().getCompanyName() != null
                            ? offer.getDrive().getCompanyName().toLowerCase() : "";
                    String role = offer.getRole() != null ? offer.getRole().toLowerCase() : "";
                    return (company + " " + role).contains(q)
                            || company.contains(q) || role.contains(q);
                })
                .toList();
        int safePage = Math.max(page, 1);
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);
        long total = filtered.size();
        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / safeLimit);
        int from = Math.min((safePage - 1) * safeLimit, filtered.size());
        int to = Math.min(from + safeLimit, filtered.size());
        List<OfferResponse> items = filtered.subList(from, to).stream()
                .map(OfferResponse::from)
                .toList();
        return new OfferPageResponse(items, total, totalPages, safePage);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferResponse> listForDrive(Long driveId) {
        return offerRepository.findByDrive_IdOrderByCreatedAtDesc(driveId).stream()
                .map(OfferResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<OfferResponse> listAll() {
        return offerRepository.findAll().stream()
                .map(OfferResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public OfferPageResponse pageForAdmin(Long driveId, String search, String status, int page, int limit) {
        int safePage = Math.max(page, 1) - 1;
        int safeLimit = limit <= 0 ? 20 : Math.min(limit, 100);
        Page<Offer> result = offerRepository.findAll(buildSpecification(driveId, search, status),
                PageRequest.of(safePage, safeLimit, Sort.by(Sort.Direction.DESC, "createdAt")));
        List<OfferResponse> items = result.getContent().stream()
                .map(OfferResponse::from)
                .toList();
        return new OfferPageResponse(items, result.getTotalElements(), result.getTotalPages(),
                result.getNumber() + 1);
    }

    private Specification<Offer> buildSpecification(Long driveId, String search, String status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (driveId != null) {
                predicates.add(cb.equal(root.get("drive").get("id"), driveId));
            }
            if (status != null && !status.isBlank()) {
                try {
                    predicates.add(cb.equal(root.get("status"), OfferStatus.valueOf(status.trim().toUpperCase())));
                } catch (IllegalArgumentException e) {
                    throw new BadRequestException("Invalid offer status: " + status.trim()
                            + ". Valid values: OFFERED, ACCEPTED, REJECTED, EXPIRED, WITHDRAWN");
                }
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                Join<Offer, Student> student = root.join("student", JoinType.LEFT);
                Join<Student, User> user = student.join("user", JoinType.LEFT);
                Join<Offer, Drive> drive = root.join("drive", JoinType.LEFT);
                predicates.add(cb.or(
                        cb.like(cb.lower(user.get("name")), like),
                        cb.like(cb.lower(user.get("email")), like),
                        cb.like(cb.lower(root.get("role")), like),
                        cb.like(cb.lower(root.get("offerNumber")), like),
                        cb.like(cb.lower(drive.get("companyName")), like)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Offer requireOwnedOffer(Long offerId, Long studentUserId) {
        Student student = requireStudent(studentUserId);
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found: " + offerId));
        if (!offer.getStudent().getId().equals(student.getId())) {
            throw new com.careerlabs.lms.api.common.exception.ForbiddenException("Offer does not belong to this student");
        }
        return offer;
    }

    private Student requireStudent(Long studentUserId) {
        return studentRepository.findByUserId(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Student profile not found for this account"));
    }

    private String generateOfferNumber() {
        return "OFF-" + LocalDate.now().getYear() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}