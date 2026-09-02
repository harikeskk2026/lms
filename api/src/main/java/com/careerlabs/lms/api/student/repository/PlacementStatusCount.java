package com.careerlabs.lms.api.student.repository;

import com.careerlabs.lms.api.student.entity.PlacementStatus;

public interface PlacementStatusCount {
    PlacementStatus getStatus();
    long getCount();
}
