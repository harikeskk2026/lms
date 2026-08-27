package com.careerlabs.lms.api.config;

import com.careerlabs.lms.api.security.JwtAuthenticationFilter;
import com.careerlabs.lms.api.security.RestAccessDeniedHandler;
import com.careerlabs.lms.api.security.RestAuthenticationEntryPoint;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                           RestAuthenticationEntryPoint authenticationEntryPoint,
                           RestAccessDeniedHandler accessDeniedHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.accessDeniedHandler = accessDeniedHandler;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
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
                        .requestMatchers("/api/auth/login", "/api/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/courses/*/enroll").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/courses/**", "/api/batches/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/courses/**", "/api/batches/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/courses/**", "/api/batches/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/courses/**", "/api/batches/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/colleges/**", "/api/departments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/colleges/**", "/api/departments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/colleges/**", "/api/departments/**").hasRole("ADMIN")
                        .requestMatchers("/api/students/**").hasRole("ADMIN")
                        .requestMatchers("/api/reports/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/assignments/*/submissions").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/assignments/*/submissions").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/assignments/*/submissions/*").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/assignments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/assignments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PATCH, "/api/assignments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/assignments/**").hasRole("ADMIN")
                        // Notification endpoints
                        .requestMatchers("/api/student/notifications/**").hasRole("STUDENT")
                        .requestMatchers("/api/admin/notifications/**").hasRole("ADMIN")
                        // Attendance endpoints
                        .requestMatchers("/api/admin/attendance/**", "/api/admin/classes/**").hasRole("ADMIN")
                        .requestMatchers("/api/student/attendance/**", "/api/student/classes/**").hasRole("STUDENT")
                        // Course content mutation endpoints (syllabus modules/topics, sessions, materials)
                        .requestMatchers(HttpMethod.POST, "/api/modules/**", "/api/topics/**", "/api/sessions/**", "/api/materials/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/modules/**", "/api/topics/**", "/api/sessions/**", "/api/materials/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/modules/**", "/api/topics/**", "/api/sessions/**", "/api/materials/**").hasRole("ADMIN")
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/student/**").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
