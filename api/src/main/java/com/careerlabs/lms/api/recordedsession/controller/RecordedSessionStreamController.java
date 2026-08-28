package com.careerlabs.lms.api.recordedsession.controller;

import com.careerlabs.lms.api.common.exception.ForbiddenException;
import com.careerlabs.lms.api.common.exception.ResourceNotFoundException;
import com.careerlabs.lms.api.recordedsession.entity.RecordedSessionAsset;
import com.careerlabs.lms.api.recordedsession.repository.RecordedSessionAssetRepository;
import com.careerlabs.lms.api.recordedsession.security.PlaybackTokenPrincipal;
import com.careerlabs.lms.api.recordedsession.service.PlaybackAuthorizationService;
import com.careerlabs.lms.api.recordedsession.service.SecureVideoStorageService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Serves the private HLS package — manifest, segments, and the AES-128 key —
 * behind the narrow playback-token filter chain (see SecurityConfig). Never
 * mapped as a static resource; every request re-validates that the caller's
 * PlaybackSession is still ACTIVE, so a revoked session stops streaming
 * immediately rather than only once its token expires.
 */
@RestController
@RequestMapping("/api/student/recorded-sessions/{id}/stream")
public class RecordedSessionStreamController {

    private static final MediaType HLS_MANIFEST_TYPE = MediaType.parseMediaType("application/vnd.apple.mpegurl");
    private static final MediaType HLS_SEGMENT_TYPE = MediaType.parseMediaType("video/MP2T");
    private static final Pattern KEY_URI_PATTERN = Pattern.compile("URI=\"[^\"]*\"");

    private final RecordedSessionAssetRepository assetRepository;
    private final PlaybackAuthorizationService playbackAuthorizationService;
    private final SecureVideoStorageService storageService;

    public RecordedSessionStreamController(RecordedSessionAssetRepository assetRepository,
                                            PlaybackAuthorizationService playbackAuthorizationService,
                                            SecureVideoStorageService storageService) {
        this.assetRepository = assetRepository;
        this.playbackAuthorizationService = playbackAuthorizationService;
        this.storageService = storageService;
    }

    @GetMapping("/manifest.m3u8")
    public ResponseEntity<String> manifest(@PathVariable Long id,
                                            @AuthenticationPrincipal PlaybackTokenPrincipal principal,
                                            HttpServletRequest request) {
        RecordedSessionAsset asset = authorize(id, principal);
        String token = request.getParameter("token");
        Path manifestPath = storageService.resolveAssetFile(id, asset.getStorageDir(), asset.getManifestFileName());

        String rewritten = rewriteManifest(readFile(manifestPath), id, token);
        return ResponseEntity.ok()
                .contentType(HLS_MANIFEST_TYPE)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(rewritten);
    }

    @GetMapping("/segments/{fileName}")
    public ResponseEntity<byte[]> segment(@PathVariable Long id, @PathVariable String fileName,
                                           @AuthenticationPrincipal PlaybackTokenPrincipal principal) {
        RecordedSessionAsset asset = authorize(id, principal);
        Path segmentPath = storageService.resolveAssetFile(id, asset.getStorageDir(), fileName);
        return ResponseEntity.ok()
                .contentType(HLS_SEGMENT_TYPE)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(readFileBytes(segmentPath));
    }

    @GetMapping("/key")
    public ResponseEntity<byte[]> key(@PathVariable Long id, @AuthenticationPrincipal PlaybackTokenPrincipal principal) {
        RecordedSessionAsset asset = authorize(id, principal);
        Path keyPath = storageService.resolveAssetFile(id, asset.getStorageDir(), asset.getKeyFileName());
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(readFileBytes(keyPath));
    }

    private RecordedSessionAsset authorize(Long id, PlaybackTokenPrincipal principal) {
        if (principal == null || !id.equals(principal.recordedSessionId())) {
            throw new ForbiddenException("This token does not authorize this recorded session");
        }
        // Re-checks PlaybackSession.status == ACTIVE on every request, independent of token expiry.
        playbackAuthorizationService.requireActiveSession(principal.studentUserId(), id, principal.deviceId());
        return assetRepository.findByRecordedSessionId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recorded session video not found: " + id));
    }

    private String rewriteManifest(String manifest, Long id, String token) {
        StringBuilder out = new StringBuilder();
        for (String line : manifest.split("\n", -1)) {
            String trimmed = line.strip();
            if (trimmed.startsWith("#EXT-X-KEY")) {
                Matcher matcher = KEY_URI_PATTERN.matcher(line);
                String rewritten = matcher.replaceFirst(Matcher.quoteReplacement(
                        "URI=\"/api/student/recorded-sessions/" + id + "/stream/key?token=" + token + "\""));
                out.append(rewritten).append('\n');
            } else if (!trimmed.isEmpty() && !trimmed.startsWith("#")) {
                out.append("/api/student/recorded-sessions/").append(id).append("/stream/segments/")
                        .append(trimmed).append("?token=").append(token).append('\n');
            } else {
                out.append(line).append('\n');
            }
        }
        return out.toString();
    }

    private String readFile(Path path) {
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read manifest", e);
        }
    }

    private byte[] readFileBytes(Path path) {
        try {
            return Files.readAllBytes(path);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read video asset", e);
        }
    }
}
