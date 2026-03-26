package com.demo.cicd.service;

import com.demo.cicd.model.Item;
import com.demo.cicd.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ItemService {

    private final ItemRepository itemRepository;

    @Autowired
    public ItemService(ItemRepository itemRepository) {
        this.itemRepository = itemRepository;
    }

    // ─── READ ─────────────────────────────────────────────────────────────────

    public List<Item> getAllItems() {
        return itemRepository.findAll();
    }

    public Optional<Item> getItemById(Long id) {
        return itemRepository.findById(id);
    }

    public List<Item> getItemsByStatus(String status) {
        return itemRepository.findByStatusOrderByCreatedAtDesc(status);
    }

    public List<Item> searchItemsByName(String name) {
        return itemRepository.findByNameContainingIgnoreCaseOrderByCreatedAtDesc(name);
    }

    // ─── CREATE ───────────────────────────────────────────────────────────────

    public Item createItem(Item item) {
        return itemRepository.save(item);
    }

    // ─── UPDATE ───────────────────────────────────────────────────────────────

    public Optional<Item> updateItem(Long id, Item updatedItem) {
        return itemRepository.findById(id).map(existing -> {
            existing.setName(updatedItem.getName());
            existing.setDescription(updatedItem.getDescription());
            existing.setStatus(updatedItem.getStatus());
            return itemRepository.save(existing);
        });
    }

    // ─── DELETE ───────────────────────────────────────────────────────────────

    public boolean deleteItem(Long id) {
        if (itemRepository.existsById(id)) {
            itemRepository.deleteById(id);
            return true;
        }
        return false;
    }

    // ─── STATS ────────────────────────────────────────────────────────────────

    public long getTotalCount() {
        return itemRepository.count();
    }
}
