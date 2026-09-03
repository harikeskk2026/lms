package com.careerlabs.lms.api.recordedsession.service;

import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;

/**
 * Storage abstraction for recorded-session video assets.
 *
 * <p>Two implementations are provided:
 * <ul>
 *   <li>{@link LocalVideoStorageService} — writes to a private local directory
 *       (active when {@code app.s3.bucket} is blank, i.e. local / dev).</li>
 *   <li>{@link S3VideoStorageService} — uploads to AWS S3
 *       (active when {@code app.s3.bucket} is non-blank).</li>
 * </ul>
 *
 * <p>FFmpeg always runs locally, so every implementation must expose
 * {@link #sessionDir(Long)} and {@link #storeSourceUpload(MultipartFile, Long)}
 * as filesystem operations. Once transcoding is done the caller invokes
 * {@link #publishTranscodedOutput(Long, Path)} to hand the output directory
 * to the implementation; after that all reads go through
 * {@link #getAssetBytes(Long, String)} / {@link #getAssetText(Long, String)}.
 */
public interface VideoStorageService {

    /**
     * Returns (and creates if absent) the private working directory for one
     * recorded session. Used by FFmpeg during transcoding.
     */
    Path sessionDir(Long recordedSessionId);

    /**
     * Validates and persists the raw uploaded video under {@link #sessionDir(Long)}.
     * Returns the local {@link Path} so the caller can pass it directly to FFmpeg.
     */
    Path storeSourceUpload(MultipartFile file, Long recordedSessionId);

    /**
     * Called once FFmpeg has finished. Implementations should copy / upload
     * the transcoded HLS output (*.m3u8, *.ts, *.key) from {@code outputDir}
     * to their backing store. The local source file has already been deleted
     * by the caller before this method returns.
     */
    void publishTranscodedOutput(Long recordedSessionId, Path outputDir);

    /**
     * Returns the raw bytes for a named asset file (segment, manifest, or key).
     * Callers must never construct paths themselves — always go through here so
     * that the path-traversal guard is applied consistently.
     */
    byte[] getAssetBytes(Long recordedSessionId, String fileName);

    /**
     * Convenience wrapper around {@link #getAssetBytes} for UTF-8 text assets
     * (.m3u8 playlists).
     */
    String getAssetText(Long recordedSessionId, String fileName);

    /**
     * Deletes all stored assets for the session (both HLS output and any
     * residual temp files).
     */
    void deleteSessionAssets(Long recordedSessionId);
}
