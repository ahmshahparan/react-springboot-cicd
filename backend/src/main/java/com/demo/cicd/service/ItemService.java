package com.demo.cicd.service;

import com.demo.cicd.model.Item;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class ItemService {

    public List<Item> getAllItems() {
        return Arrays.asList(
            new Item(1L, "AWS CodePipeline", "Fully managed CI/CD service", "active"),
            new Item(2L, "AWS CodeBuild", "Build and test code in the cloud", "active"),
            new Item(3L, "AWS CodeDeploy", "Automate code deployments to EC2", "active"),
            new Item(4L, "Amazon EC2", "Scalable virtual servers in the cloud", "active"),
            new Item(5L, "Amazon S3", "Object storage for build artifacts", "active"),
            new Item(6L, "AWS IAM", "Identity and access management", "active"),
            new Item(7L, "Amazon CloudWatch", "Monitoring and observability", "active"),
            new Item(8L, "GitHub Integration", "Source control trigger for pipeline", "active")
        );
    }

    public Item getItemById(Long id) {
        return getAllItems().stream()
            .filter(item -> item.getId().equals(id))
            .findFirst()
            .orElse(null);
    }
}
