package dev.eventflow;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import dev.eventflow.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(
    properties = {
      "spring.datasource.url=jdbc:h2:mem:security;DB_CLOSE_DELAY=-1",
      "app.scheduling-enabled=false",
      "spring.kafka.listener.auto-startup=false",
      "spring.kafka.admin.auto-create=false"
    })
@AutoConfigureMockMvc
class SecurityApiTest {
  @Autowired MockMvc mvc;

  @Test
  void anonymousCannotReadPosts() throws Exception {
    mvc.perform(get("/api/posts")).andExpect(status().isUnauthorized());
  }

  @Test
  @WithMockUser(roles = "VIEWER")
  void viewerCannotPublish() throws Exception {
    mvc.perform(post("/api/demo/success")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "EDITOR")
  void editorCannotManageUsers() throws Exception {
    mvc.perform(get("/api/team")).andExpect(status().isForbidden());
  }

  @Test
  @WithMockUser(roles = "VIEWER")
  void viewerReadsPosts() throws Exception {
    mvc.perform(get("/api/posts"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data").isArray());
  }

  @Test
  @WithMockUser(roles = "EDITOR")
  void invalidPostRejected() throws Exception {
    mvc.perform(post("/api/posts").contentType("application/json").content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void registerLoginAndReadWithJwt() throws Exception {
    mvc.perform(
            post("/api/auth/register")
                .contentType("application/json")
                .content(
                    "{\"email\":\"viewer@example.com\",\"password\":\"correct-password-123\"}"))
        .andExpect(status().isCreated());
    String response =
        mvc.perform(
                post("/api/auth/login")
                    .contentType("application/json")
                    .content(
                        "{\"email\":\"viewer@example.com\",\"password\":\"correct-password-123\"}"))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String token =
        new com.fasterxml.jackson.databind.ObjectMapper()
            .readTree(response)
            .path("data")
            .path("token")
            .asText();
    mvc.perform(get("/api/posts").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
    mvc.perform(post("/api/demo/success").header("Authorization", "Bearer " + token))
        .andExpect(status().isForbidden());
  }

  @Autowired dev.eventflow.service.EventService service;

  @Test
  @WithMockUser(roles = "ADMIN")
  void apiWorkflowsAndAnalytics() throws Exception {
    mvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk());
    mvc.perform(get("/api/analytics")).andExpect(status().isOk());
    String content =
        "{\"title\":\"API"
            + " post\",\"content\":\"Content\",\"platform\":\"X\",\"scheduledAt\":\"2030-01-01T00:00:00Z\"}";
    String response =
        mvc.perform(post("/api/posts").contentType("application/json").content(content))
            .andExpect(status().isCreated())
            .andReturn()
            .getResponse()
            .getContentAsString();
    String id =
        new com.fasterxml.jackson.databind.ObjectMapper()
            .readTree(response)
            .path("data")
            .path("eventId")
            .asText();
    mvc.perform(get("/api/events/" + id))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.data.history").isArray());
    mvc.perform(post("/api/posts/" + id + "/process-now")).andExpect(status().isCreated());
    for (String scenario :
        java.util.List.of("success", "duplicate", "transient-failure", "permanent-failure"))
      mvc.perform(post("/api/demo/" + scenario)).andExpect(status().isAccepted());
    mvc.perform(post("/api/demo/unknown")).andExpect(status().isNotFound());
    for (String sort : java.util.List.of("status", "attempts", "createdAt"))
      mvc.perform(get("/api/events").param("sort", sort).param("order", "asc"))
          .andExpect(status().isOk());
    mvc.perform(get("/api/events").param("search", "API").param("status", "SCHEDULED"))
        .andExpect(status().isOk());
    mvc.perform(get("/api/events").param("page", "-1")).andExpect(status().isBadRequest());
    mvc.perform(get("/api/events/missing")).andExpect(status().isNotFound());
    mvc.perform(get("/api/system/health")).andExpect(status().isOk());
    mvc.perform(get("/api/events/activity")).andExpect(status().isOk());
    mvc.perform(get("/api/dlq")).andExpect(status().isOk());
    mvc.perform(post("/api/dlq/" + id + "/reprocess")).andExpect(status().isConflict());
    var event = service.require(id);
    event.scheduledAt = java.time.Instant.now();
    // Create a due event to exercise database-derived success analytics.
    var due =
        service.create(
            new dev.eventflow.dto.CreatePost(
                null, "analytics", "body", "X", java.time.Instant.now()),
            "NORMAL",
            1);
    service.process(dev.eventflow.dto.EventMessage.from(due));
    mvc.perform(get("/api/dashboard/stats")).andExpect(status().isOk());
    mvc.perform(get("/api/analytics")).andExpect(status().isOk());
  }

  @Test
  @WithMockUser(roles = "ADMIN")
  void teamRolesAndAccountErrors() throws Exception {
    String credentials = "{\"email\":\"team@example.com\",\"password\":\"team-password-123\"}";
    mvc.perform(post("/api/auth/register").contentType("application/json").content(credentials))
        .andExpect(status().isCreated());
    mvc.perform(post("/api/auth/register").contentType("application/json").content(credentials))
        .andExpect(status().isConflict());
    mvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content(credentials.replace("team-password-123", "wrong-password-123")))
        .andExpect(status().isUnauthorized());
    mvc.perform(
            post("/api/auth/login")
                .contentType("application/json")
                .content(credentials.replace("team@example.com", "missing@example.com")))
        .andExpect(status().isUnauthorized());
    mvc.perform(get("/api/team")).andExpect(status().isOk());
    mvc.perform(
            post("/api/team/role")
                .contentType("application/json")
                .content("{\"email\":\"team@example.com\",\"role\":\"EDITOR\"}"))
        .andExpect(status().isOk());
    mvc.perform(
            post("/api/team/role")
                .contentType("application/json")
                .content("{\"email\":\"missing@example.com\",\"role\":\"EDITOR\"}"))
        .andExpect(status().isNotFound());
  }
}
