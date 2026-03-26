package com.demo.cicd.controller;

import com.demo.cicd.model.HealthResponse;
import com.demo.cicd.model.Item;
import com.demo.cicd.service.ItemService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired
    private ItemService itemService;

    // ─── HEALTH ───────────────────────────────────────────────────────────────

    /**
     * Health check endpoint — used by AWS CodeDeploy and load balancers.
     * Also includes the total item count from the database.
     */
    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        HealthResponse response = new HealthResponse();
        response.setDbItemCount(itemService.getTotalCount());
        return ResponseEntity.ok(response);
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/items — Returns all items, or filtered by status/search query.
     * Examples:
     *   GET /api/items
     *   GET /api/items?status=active
     *   GET /api/items?search=pipeline
     */
    @GetMapping("/items")
    public ResponseEntity<List<Item>> getItems(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {

        List<Item> items;
        if (search != null && !search.isBlank()) {
            items = itemService.searchItemsByName(search);
        } else if (status != null && !status.isBlank()) {
            items = itemService.getItemsByStatus(status);
        } else {
            items = itemService.getAllItems();
        }
        return ResponseEntity.ok(items);
    }

    /**
     * GET /api/items/{id} — Returns a single item by its ID.
     */
    @GetMapping("/items/{id}")
    public ResponseEntity<?> getItemById(@PathVariable Long id) {
        Optional<Item> item = itemService.getItemById(id);
        return item.<ResponseEntity<?>>map(ResponseEntity::ok)
                   .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                       .body(Map.of("error", "Item not found with id: " + id)));
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────

    /**
     * POST /api/items — Creates a new item and persists it to MySQL RDS.
     * Request body: { "name": "...", "description": "...", "status": "active" }
     */
    @PostMapping("/items")
    public ResponseEntity<?> createItem(@Valid @RequestBody Item item) {
        Item created = itemService.createItem(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    /**
     * PUT /api/items/{id} — Updates an existing item by its ID.
     * Request body: { "name": "...", "description": "...", "status": "..." }
     */
    @PutMapping("/items/{id}")
    public ResponseEntity<?> updateItem(@PathVariable Long id, @Valid @RequestBody Item item) {
        Optional<Item> updated = itemService.updateItem(id, item);
        return updated.<ResponseEntity<?>>map(ResponseEntity::ok)
                      .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                          .body(Map.of("error", "Item not found with id: " + id)));
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────

    /**
     * DELETE /api/items/{id} — Deletes an item by its ID.
     */
    @DeleteMapping("/items/{id}")
    public ResponseEntity<?> deleteItem(@PathVariable Long id) {
        boolean deleted = itemService.deleteItem(id);
        if (deleted) {
            return ResponseEntity.ok(Map.of("message", "Item deleted successfully", "id", id));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Item not found with id: " + id));
    }

    // ─── STATS ────────────────────────────────────────────────────────────────

    /**
     * GET /api/items/stats — Returns aggregate statistics from the database.
     */
    @GetMapping("/items/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(Map.of(
            "total", itemService.getTotalCount(),
            "active", itemService.getItemsByStatus("active").size(),
            "inactive", itemService.getItemsByStatus("inactive").size()
        ));
    }

    // ─── ECHO ─────────────────────────────────────────────────────────────────

    /**
     * POST /api/echo — Echoes back the request body (useful for testing).
     */
    @PostMapping("/echo")
    public ResponseEntity<Map<String, Object>> echo(@RequestBody Map<String, Object> body) {
        body.put("echo", true);
        body.put("receivedAt", java.time.LocalDateTime.now().toString());
        return ResponseEntity.ok(body);
    }
}
