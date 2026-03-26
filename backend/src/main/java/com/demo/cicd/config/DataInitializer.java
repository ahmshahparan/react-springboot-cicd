package com.demo.cicd.config;

import com.demo.cicd.model.Item;
import com.demo.cicd.repository.ItemRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Seeds the MySQL database with sample data on first startup.
 * Only inserts data if the items table is empty.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private ItemRepository itemRepository;

    @Override
    public void run(String... args) {
        if (itemRepository.count() == 0) {
            itemRepository.save(new Item("AWS CodePipeline",    "Fully managed CI/CD orchestration service",        "active"));
            itemRepository.save(new Item("AWS CodeBuild",       "Build and test code in the cloud",                  "active"));
            itemRepository.save(new Item("AWS CodeDeploy",      "Automate code deployments to EC2 instances",        "active"));
            itemRepository.save(new Item("Amazon EC2",          "Scalable virtual servers in the cloud",             "active"));
            itemRepository.save(new Item("Amazon S3",           "Object storage for build artifacts",                "active"));
            itemRepository.save(new Item("AWS IAM",             "Identity and access management for AWS",            "active"));
            itemRepository.save(new Item("Amazon RDS MySQL",    "Managed relational database service",               "active"));
            itemRepository.save(new Item("Amazon CloudWatch",   "Monitoring, logging, and observability",            "active"));
            System.out.println("DataInitializer: Seeded 8 sample items into MySQL RDS.");
        } else {
            System.out.println("DataInitializer: Database already has data, skipping seed.");
        }
    }
}
