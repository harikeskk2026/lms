package com.careerlabs.lms.api.config;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.drive.DriveScopes;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.io.FileReader;
import java.util.Collections;

@RestController
public class GoogleOAuth2Controller {

    private static final Logger log = LoggerFactory.getLogger(GoogleOAuth2Controller.class);
    private static final String TOKENS_DIRECTORY_PATH = "credentials/tokens";
    private static final String USER_ID = "user";

    @Value("${server.port:8081}")
    private String serverPort;

    private GoogleAuthorizationCodeFlow getFlow() throws Exception {
        File credentialsFile = new File("credentials/client_secret.json");
        if (!credentialsFile.exists()) {
            throw new IllegalStateException("credentials/client_secret.json not found");
        }

        GoogleClientSecrets clientSecrets = GoogleClientSecrets.load(
                GsonFactory.getDefaultInstance(), new FileReader(credentialsFile));

        return new GoogleAuthorizationCodeFlow.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                clientSecrets,
                Collections.singletonList(DriveScopes.DRIVE_FILE))
                .setDataStoreFactory(new FileDataStoreFactory(new File(TOKENS_DIRECTORY_PATH)))
                .setAccessType("offline")
                .setApprovalPrompt("force")
                .build();
    }

    @GetMapping("/oauth2/authorize")
    public void authorize(HttpServletResponse response) throws Exception {
        GoogleAuthorizationCodeFlow flow = getFlow();
        String redirectUri = "http://localhost:" + serverPort + "/oauth2/callback";
        String url = flow.newAuthorizationUrl().setRedirectUri(redirectUri).build();
        log.info("Redirecting to Google OAuth URL: {}", url);
        response.sendRedirect(url);
    }

    @GetMapping("/oauth2/callback")
    public String callback(@RequestParam(value = "code", required = false) String code,
                           @RequestParam(value = "error", required = false) String error) throws Exception {
        if (error != null) {
            return "OAuth Authorization Failed: " + error;
        }
        if (code == null) {
            return "Missing authorization code";
        }

        GoogleAuthorizationCodeFlow flow = getFlow();
        String redirectUri = "http://localhost:" + serverPort + "/oauth2/callback";

        GoogleTokenResponse tokenResponse = flow.newTokenRequest(code)
                .setRedirectUri(redirectUri)
                .execute();

        Credential credential = flow.createAndStoreCredential(tokenResponse, USER_ID);
        log.info("Google OAuth Success! Stored credential for Google Drive.");

        return "<html><body style='font-family:sans-serif;padding:40px;text-align:center;'>"
                + "<h2 style='color:#16a34a;'>Google Drive Authorized Successfully!</h2>"
                + "<p>Credentials saved to <code>credentials/tokens</code>.</p>"
                + "<p>You can now close this tab and upload videos via <code>/api/drive/upload</code>.</p>"
                + "</body></html>";
    }
}
