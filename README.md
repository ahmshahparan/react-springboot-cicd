# AWS CI/CD Pipeline: React + Spring Boot Deployment Guide

This comprehensive guide provides step-by-step instructions for deploying a full-stack React and Spring Boot application using AWS CodePipeline, CodeBuild, and CodeDeploy within a Whizlabs AWS Sandbox environment. The architecture leverages Docker and Docker Compose to containerize the application, ensuring consistent deployments across environments.

## Architecture Overview

The deployment architecture consists of a React frontend and a Spring Boot backend, both containerized using Docker. The CI/CD pipeline is fully automated using AWS native services.

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18 (Vite), Nginx | Serves the user interface and proxies API requests |
| **Backend** | Spring Boot 3.x, Java 17 | Provides RESTful APIs and business logic |
| **Containerization** | Docker, Docker Compose | Packages applications and manages multi-container execution |
| **Source Control** | GitHub | Hosts the source code and triggers the pipeline |
| **Continuous Integration** | AWS CodeBuild | Compiles code, runs tests, and builds Docker images |
| **Continuous Deployment** | AWS CodeDeploy | Automates application deployment to EC2 instances |
| **Orchestration** | AWS CodePipeline | Manages the end-to-end CI/CD workflow |
| **Compute** | Amazon EC2 (Amazon Linux 2) | Hosts the deployed application containers |

## Prerequisites

Before beginning the deployment process in your Whizlabs AWS Sandbox, ensure you have the following prerequisites configured.

You must have an active GitHub account to host the repository. A GitHub Personal Access Token (classic) is required with `repo` and `admin:repo_hook` scopes to allow AWS CodePipeline to access your repository and configure webhooks.

You will also need access to your Whizlabs AWS Sandbox environment. Ensure you have the AWS Console URL, IAM user credentials, and sufficient permissions to create EC2 instances, IAM roles, S3 buckets, and CodePipeline resources.

## Step 1: Repository Setup

The first step is to prepare your GitHub repository with the application code.

Create a new repository on GitHub named `react-springboot-cicd`. Do not initialize it with a README, .gitignore, or license, as we will push the existing code.

Clone the repository to your local machine or use the provided project files. Initialize a Git repository in the project root directory, commit all files, and push them to your new GitHub repository.

```bash
cd aws-cicd-project
git init
git add .
git commit -m "Initial commit: React + Spring Boot CI/CD project"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/react-springboot-cicd.git
git push -u origin main
```

## Step 2: AWS Environment Preparation

Log in to your Whizlabs AWS Sandbox console using the provided credentials.

Navigate to the EC2 dashboard and create a new Key Pair. Name it `cicd-keypair` and select the `RSA` type and `.pem` format. Download and save this key pair securely, as it will be required to SSH into your EC2 instance if troubleshooting is necessary.

## Step 3: Infrastructure Deployment via CloudFormation

We will use AWS CloudFormation to provision the entire CI/CD infrastructure, including IAM roles, security groups, the EC2 instance, and the CodePipeline resources.

Navigate to the CloudFormation service in the AWS Console. Click **Create stack** and select **With new resources (standard)**.

Choose **Upload a template file** and select the `cloudformation/pipeline.yml` file from the project directory. Click **Next**.

Provide a stack name, such as `react-springboot-cicd-stack`. Fill in the parameters with your specific details:
- **GitHubOwner**: Your GitHub username
- **GitHubRepo**: `react-springboot-cicd`
- **GitHubBranch**: `main`
- **GitHubToken**: Your GitHub Personal Access Token
- **EC2KeyPair**: Select the `cicd-keypair` you created earlier
- **EC2InstanceType**: `t3.small` (recommended for running Spring Boot and React builds)

Click **Next** through the remaining screens, acknowledge that CloudFormation might create IAM resources, and click **Submit**.

The stack creation process will take approximately 5-10 minutes. You can monitor the progress in the CloudFormation console. Once the status changes to `CREATE_COMPLETE`, your infrastructure is ready.

## Step 4: Pipeline Execution and Monitoring

Once the CloudFormation stack is successfully created, the CodePipeline will automatically trigger its first execution.

Navigate to the CodePipeline console to monitor the progress. You will see three stages: **Source**, **Build**, and **Deploy**.

The **Source** stage fetches the latest code from your GitHub repository using the provided token.

The **Build** stage uses AWS CodeBuild to compile the Spring Boot application, build the React frontend, and prepare the deployment artifacts as defined in the `buildspec.yml` file. You can click on the **Details** link in the Build stage to view the real-time build logs.

The **Deploy** stage uses AWS CodeDeploy to transfer the artifacts to the EC2 instance and execute the deployment scripts defined in the `appspec.yml` file. These scripts install Docker, clean up previous deployments, and start the new containers using Docker Compose.

## Step 5: Application Verification

After the pipeline completes successfully, you can access your deployed application.

Navigate to the CloudFormation console, select your stack, and click on the **Outputs** tab. Locate the `AppURL` output value, which contains the public DNS name of your EC2 instance.

Open a web browser and navigate to the `AppURL`. You should see the React frontend displaying the application status and data fetched from the Spring Boot backend.

The application includes a health check endpoint that verifies the backend API is functioning correctly. You can also click the "Fetch Items" button to retrieve data from the Spring Boot service, confirming full-stack connectivity.

## Troubleshooting Guide

If you encounter issues during the deployment process, consult the following troubleshooting steps.

### Build Failures

If the CodeBuild stage fails, click on the **Details** link in the CodePipeline console to view the build logs. Common issues include incorrect dependency versions, compilation errors in the Java code, or syntax errors in the React application. Ensure that the `buildspec.yml` file correctly specifies the required runtime versions (Java 17 and Node.js 20).

### Deployment Failures

If the CodeDeploy stage fails, the issue is likely related to the deployment scripts or the EC2 instance configuration.

You can SSH into the EC2 instance using the key pair you created earlier to investigate further.

```bash
ssh -i "cicd-keypair.pem" ec2-user@<EC2_PUBLIC_IP>
```

Check the CodeDeploy agent logs for detailed error messages:

```bash
sudo tail -f /var/log/aws/codedeploy-agent/codedeploy-agent.log
```

Review the deployment script execution logs located in the deployment archive directory:

```bash
cat /opt/codedeploy-agent/deployment-root/<deployment-group-id>/<deployment-id>/logs/scripts.log
```

### Application Runtime Issues

If the pipeline completes successfully but the application is not accessible, verify that the Docker containers are running correctly on the EC2 instance.

SSH into the instance and check the container status:

```bash
cd /home/ec2-user/app
docker-compose ps
```

View the container logs to identify any startup errors:

```bash
docker-compose logs -f
```

Ensure that the security group associated with the EC2 instance allows inbound traffic on ports 80 (HTTP) and 8080 (Backend API).

## Conclusion

You have successfully deployed a full-stack React and Spring Boot application using a fully automated AWS CI/CD pipeline. This architecture provides a robust foundation for continuous integration and continuous deployment, enabling rapid iteration and reliable software delivery in your Whizlabs AWS Sandbox environment.

## References

[1] AWS CodePipeline Documentation: https://docs.aws.amazon.com/codepipeline/
[2] AWS CodeBuild Documentation: https://docs.aws.amazon.com/codebuild/
[3] AWS CodeDeploy Documentation: https://docs.aws.amazon.com/codedeploy/
[4] Spring Boot Reference Guide: https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/
[5] React Documentation: https://react.dev/learn
