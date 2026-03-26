package com.demo.cicd.repository;

import com.demo.cicd.model.Item;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemRepository extends JpaRepository<Item, Long> {

    // Find all items by status (e.g., "active", "inactive")
    List<Item> findByStatusOrderByCreatedAtDesc(String status);

    // Find items whose name contains the given string (case-insensitive)
    List<Item> findByNameContainingIgnoreCaseOrderByCreatedAtDesc(String name);
}
