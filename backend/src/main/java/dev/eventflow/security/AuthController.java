package dev.eventflow.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class AuthController {
  private final Accounts accounts;
  private final BCryptPasswordEncoder passwords;
  private final JwtEncoder encoder;

  public AuthController(Accounts a, BCryptPasswordEncoder p, JwtEncoder e) {
    accounts = a;
    passwords = p;
    encoder = e;
  }

  public record Credentials(
      @Email @NotBlank String email, @NotBlank @Size(min = 10, max = 72) String password) {}

  @PostMapping("/auth/register")
  @ResponseStatus(HttpStatus.CREATED)
  public Object register(@Valid @RequestBody Credentials c) {
    String email = c.email().toLowerCase(Locale.ROOT).trim();
    if (accounts.existsById(email))
      throw new ResponseStatusException(HttpStatus.CONFLICT, "Account already exists");
    var a = new Account();
    a.email = email;
    a.passwordHash = passwords.encode(c.password());
    accounts.save(a);
    return Map.of("data", Map.of("email", email, "role", a.role));
  }

  @PostMapping("/auth/login")
  public Object login(@Valid @RequestBody Credentials c) {
    var a =
        accounts
            .findById(c.email().toLowerCase(Locale.ROOT).trim())
            .orElseThrow(
                () -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    if (!passwords.matches(c.password(), a.passwordHash))
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    var now = Instant.now();
    String token =
        encoder
            .encode(
                JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(),
                    JwtClaimsSet.builder()
                        .issuer("eventflow")
                        .subject(a.email)
                        .issuedAt(now)
                        .expiresAt(now.plusSeconds(1800))
                        .build()))
            .getTokenValue();
    return Map.of(
        "data",
        Map.of(
            "token",
            token,
            "email",
            a.email,
            "role",
            a.role,
            "expiresAt",
            now.plusSeconds(1800).toString()));
  }

  @GetMapping("/team")
  public Object team() {
    return Map.of(
        "data",
        accounts.findAll().stream().map(a -> Map.of("email", a.email, "role", a.role)).toList());
  }

  public record RoleUpdate(
      @NotBlank String email, @NotNull @Pattern(regexp = "EDITOR|VIEWER") String role) {}

  @PostMapping("/team/role")
  public Object role(@Valid @RequestBody RoleUpdate r) {
    var a =
        accounts
            .findById(r.email())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    if (a.role.equals("ADMIN"))
      throw new ResponseStatusException(
          HttpStatus.CONFLICT, "Bootstrap administrator cannot be changed here");
    a.role = r.role();
    accounts.save(a);
    return Map.of("data", Map.of("email", a.email, "role", a.role));
  }
}
