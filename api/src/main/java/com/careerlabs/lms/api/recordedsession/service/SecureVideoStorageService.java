package com.careerlabs.lms.api.recordedsession.service;

/**
 * @deprecated Use {@link VideoStorageService} instead (injected as either
 * {@link LocalVideoStorageService} or {@link S3VideoStorageService} depending on
 * the {@code app.s3.bucket} configuration property).
 * <p>
 * This class is kept as an empty marker so that any Spring bean reference that
 * was using the old concrete type by name still resolves without a compilation
 * error. It will be removed in a future cleanup pass.
 */
@Deprecated(since = "s3-migration", forRemoval = true)
public class SecureVideoStorageService {
    // Intentionally empty — replaced by VideoStorageService + LocalVideoStorageService / S3VideoStorageService
}
