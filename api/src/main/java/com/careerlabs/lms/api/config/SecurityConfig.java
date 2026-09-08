package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.recordedsession.security.PlaybackTokenAuthenticationFilter;
import com.careerlabs.lms.api.security.JwtAuthenticationFilter;
import com.careerlabs.lms.api.security.RestAccessDeniedHandler;
import com.careerlabs.lms.api.security.RestAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final PlaybackTokenAuthenticationFilter playbackTokenAuthenticationFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                           PlaybackTokenAuthenticationFilter playbackTokenAuthenticationFilter,
                           RestAuthenticationEntryPoint authenticationEntryPoint,
                           RestAccessDeniedHandler accessDeniedHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.playbackTokenAuthenticationFilter = playbackTokenAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Uploaded files (assignment attachments, etc.) are viewed inline in an <iframe> by the
    // frontend, which runs on a different origin than this API. Spring Security's default
    // X-Frame-Options: DENY blocks that framing entirely, so this path gets its own chain
    // with frame options relaxed to same-origin-with-the-serving-origin (the file itself has
    // no auth check either way — see the permitAll below).
    @Bean
    @Order(1)
    public SecurityFilterChain uploadsFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/uploads/**")
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .headers(headers -> headers.frameOptions(frame -> frame.disable()));

        return http.build();
    }

    /**
     * Narrow chain, evaluated first (lower @Order = higher precedence): only the
     * recorded-session HLS stream endpoints, authenticated by a short-lived
     * playback token in a query param instead of the normal login JWT. Everything
     * else falls through to {@link #filterChain(HttpSecurity)} below, unchanged.
     */
    @Bean
    @Order(2)
    public SecurityFilterChain playbackStreamFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/student/recorded-sessions/*/stream/**")
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .addFilterBefore(playbackTokenAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    @Order(3)
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login", "/api/health", "/oauth2/**", "/api/drive/**", "/error").permitAll()
                        .requestMatchers("/api/admin/admins", "/api/admin/admins/**").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/admin/users/*/reset-password").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/courses/*/enroll").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/courses/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/courses/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/courses/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/courses/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/batches/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/batches/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/batches/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/batches/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/colleges/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/colleges/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/students", "/api/students/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers("/api/students", "/api/students/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers("/api/trainers", "/api/trainers/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/reports", "/api/reports/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers("/api/reports", "/api/reports/**").hasAnyRole("ADMIN", "SUPERADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/assignments/*/submissions").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/assignments/*/submissions").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.PATCH, "/api/assignments/*/submissions/*").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.POST, "/api/assignments/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.PUT, "/api/assignments/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.PATCH, "/api/assignments/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.DELETE, "/api/assignments/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        // Notification endpoints
                        .requestMatchers("/api/student/notifications/**").hasRole("STUDENT")
                        .requestMatchers("/api/admin/notifications/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        // Attendance endpoints
                        .requestMatchers("/api/admin/attendance/**", "/api/admin/classes/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers("/api/student/attendance/**", "/api/student/classes/**").hasRole("STUDENT")
                        // Meeting link endpoints
                        .requestMatchers("/api/admin/meetings/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers("/api/student/meetings/**").hasRole("STUDENT")
                        // Placement endpoints
                        .requestMatchers("/api/student/placement/**", "/api/student/skills/**",
                                "/api/student/resume/**", "/api/student/resume-file",
                                "/api/student/drives/**", "/api/student/mock-interviews/**",
                                "/api/student/mock-analytics").hasRole("STUDENT")
                        // Course content mutation endpoints (syllabus modules/topics, sessions, materials)
                        .requestMatchers(HttpMethod.POST, "/api/modules/**", "/api/topics/**", "/api/sessions/**", "/api/materials/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.PUT, "/api/modules/**", "/api/topics/**", "/api/sessions/**", "/api/materials/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers(HttpMethod.DELETE, "/api/modules/**", "/api/topics/**", "/api/sessions/**", "/api/materials/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "SUPERADMIN", "TRAINER")
                        .requestMatchers("/api/student/**").authenticated()
                        .anyRequest().authenticated()

                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
