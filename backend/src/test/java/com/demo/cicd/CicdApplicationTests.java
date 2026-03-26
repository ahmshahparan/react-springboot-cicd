package com.demo.cicd;

import com.demo.cicd.model.Item;
import com.demo.cicd.repository.ItemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class CicdApplicationTests {

    @Autowired
    private ItemRepository itemRepository;

    @Test
    void contextLoads() {
        // Verify Spring context loads successfully with H2 test database
    }

    @Test
    void canCreateAndRetrieveItem() {
        Item item = new Item("Test Item", "A test description", "active");
        Item saved = itemRepository.save(item);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getName()).isEqualTo("Test Item");
        assertThat(saved.getStatus()).isEqualTo("active");
        assertThat(saved.getCreatedAt()).isNotNull();

        // Clean up
        itemRepository.deleteById(saved.getId());
    }

    @Test
    void canUpdateItem() {
        Item item = itemRepository.save(new Item("Original Name", "Original desc", "active"));
        item.setName("Updated Name");
        item.setStatus("inactive");
        Item updated = itemRepository.save(item);

        assertThat(updated.getName()).isEqualTo("Updated Name");
        assertThat(updated.getStatus()).isEqualTo("inactive");

        // Clean up
        itemRepository.deleteById(updated.getId());
    }

    @Test
    void canDeleteItem() {
        Item item = itemRepository.save(new Item("To Delete", "Will be deleted", "active"));
        Long id = item.getId();
        itemRepository.deleteById(id);
        assertThat(itemRepository.findById(id)).isEmpty();
    }
}
