package dev.eventflow.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

@io.swagger.v3.oas.annotations.security.SecurityScheme(name="bearerAuth",type=io.swagger.v3.oas.annotations.enums.SecuritySchemeType.HTTP,scheme="bearer",bearerFormat="JWT")
@io.swagger.v3.oas.annotations.OpenAPIDefinition(security=@io.swagger.v3.oas.annotations.security.SecurityRequirement(name="bearerAuth"))
@Configuration
public class SecurityConfig {
  @Bean
  BCryptPasswordEncoder passwords() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  SecretKeySpec key(@Value("${app.jwt-secret}") String s) {
    if (s.length() < 32)
      throw new IllegalArgumentException("JWT_SECRET must contain at least 32 characters");
    return new SecretKeySpec(s.getBytes(java.nio.charset.StandardCharsets.UTF_8), "HmacSHA256");
  }

  @Bean
  JwtEncoder encoder(SecretKeySpec key) {
    return new NimbusJwtEncoder(new ImmutableSecret<>(key));
  }

  @Bean
  JwtDecoder decoder(SecretKeySpec key) {
    var d = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    d.setJwtValidator(JwtValidators.createDefaultWithIssuer("eventflow"));
    return d;
  }

  @Bean
  SecurityFilterChain security(HttpSecurity h, Accounts accounts) throws Exception {
    var converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(
        jwt ->
            accounts
                .findById(jwt.getSubject())
                .map(
                    a ->
                        java.util.List.<org.springframework.security.core.GrantedAuthority>of(
                            new org.springframework.security.core.authority.SimpleGrantedAuthority(
                                "ROLE_" + a.role)))
                .orElse(java.util.List.of()));
    return h.cors(c -> {})
        .csrf(c -> c.disable())
        .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(
            a ->
                a.requestMatchers(
                        "/api/auth/login",
                        "/api/auth/register",
                        "/actuator/health",
                        "/v3/api-docs/**",
                        "/swagger-ui/**",
                        "/swagger-ui.html")
                    .permitAll()
                    .requestMatchers("/api/team/**")
                    .hasRole("ADMIN")
                    .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/**")
                    .hasAnyRole("ADMIN", "EDITOR", "VIEWER")
                    .requestMatchers("/api/**")
                    .hasAnyRole("ADMIN", "EDITOR")
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(converter)))
        .build();
  }
}
