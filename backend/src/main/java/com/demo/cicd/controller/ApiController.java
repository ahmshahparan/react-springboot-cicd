package com.demo.cicd.controller;

import com.demo.cicd.model.HealthResponse;
import com.demo.cicd.model.Item;
import com.demo.cicd.service.ItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    @Autowired
    private ItemService itemService;

    /**
     * Health check endpoint — used by AWS CodeDeploy and load balancers
     */
    @GetMapping("/health")
    public ResponseEntity<HealthResponse> health() {
        return ResponseEntity.ok(new HealthResponse());
    }

    /**
     * Get all items
     */
    @GetMapping("/items")
    public ResponseEntity<List<Item>> getItems() {
        return ResponseEntity.ok(itemService.getAllItems());
    }

    /**
     * Get item by ID
     */
    @GetMapping("/items/{id}")
    public ResponseEntity<?> getItemById(@PathVariable Long id) {
        Item item = itemService.getItemById(id);
        if (item == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(item);
    }

    /**
     * Echo endpoint for testing
     */
    @PostMapping("/echo")
    public ResponseEntity<Map<String, Object>> echo(@RequestBody Map<String, Object> body) {
        body.put("echo", true);
        body.put("receivedAt", java.time.LocalDateTime.now().toString());
        return ResponseEntity.ok(body);
    }
}
