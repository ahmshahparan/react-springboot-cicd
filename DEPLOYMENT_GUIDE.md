# Complete Beginner's Guide: Deploying a React + Spring Boot App on AWS Using CI/CD

**A step-by-step walkthrough for the Whizlabs AWS Sandbox environment**

> This guide assumes you have never used AWS, GitHub, or Docker before. Every single step is explained in plain language. Follow each step in order and you will have a live, fully automated deployment pipeline running on AWS.

---

## Table of Contents

1. [What Are We Building?](#1-what-are-we-building)
2. [Understanding the Technology Stack](#2-understanding-the-technology-stack)
3. [How the CI/CD Pipeline Works](#3-how-the-cicd-pipeline-works)
4. [What the Application Does](#4-what-the-application-does)
5. [Understanding Dockerization](#5-understanding-dockerization)
6. [Understanding Every Configuration File](#6-understanding-every-configuration-file)
7. [Part A: Setting Up GitHub](#part-a-setting-up-github)
8. [Part B: Configuring the AWS CLI](#part-b-configuring-the-aws-cli)
9. [Part C: Creating AWS Infrastructure](#part-c-creating-aws-infrastructure)
10. [Part D: Setting Up the CI/CD Pipeline](#part-d-setting-up-the-cicd-pipeline)
11. [Part E: The Whizlabs Sandbox Workaround](#part-e-the-whizlabs-sandbox-workaround)
12. [Part F: Running and Verifying the Pipeline](#part-f-running-and-verifying-the-pipeline)
13. [Part G: Testing the CI/CD Loop](#part-g-testing-the-cicd-loop)
14. [Troubleshooting Reference](#troubleshooting-reference)
15. [Glossary](#glossary)

---

## 1. What Are We Building?

We are building a complete, production-style deployment system for a full-stack web application. By the end of this guide, you will have:

- A **React web application** running live on the internet, accessible via a public IP address.
- A **Spring Boot REST API** running behind the scenes, serving data to the frontend.
- Both applications running inside **Docker containers** on a single AWS EC2 virtual machine.
- A **fully automated CI/CD pipeline** that watches your GitHub repository. Every time you push new code, the pipeline automatically compiles, tests, packages, and deploys your application — without you touching the server.

The final architecture looks like this:

```
You push code to GitHub
        │
        ▼
┌───────────────────┐
│  AWS CodePipeline │  ◄── Detects the GitHub push and starts the workflow
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  AWS CodeBuild    │  ◄── Compiles Java, builds React, packages artifacts
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  Amazon S3        │  ◄── Stores the compiled artifact .zip file
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  AWS CodeDeploy   │  ◄── Sends the artifact to the EC2 server
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────────────┐
│  Amazon EC2 Instance (t2.micro)           │
│  ┌─────────────────┐ ┌─────────────────┐  │
│  │  Docker: Nginx  │ │  Docker: Java   │  │
│  │  React Frontend │ │  Spring Boot    │  │
│  │  Port 80        │ │  Port 8080      │  │
│  └─────────────────┘ └─────────────────┘  │
└───────────────────────────────────────────┘
         │
         ▼
  Users access the app at http://YOUR_EC2_IP
```

---

## 2. Understanding the Technology Stack

| Technology | What It Is | Why We Use It |
| :--- | :--- | :--- |
| **React 18** | A JavaScript library for building user interfaces | Creates the interactive web page users see |
| **Vite** | A fast build tool for JavaScript projects | Compiles React JSX code into plain HTML/JS |
| **Spring Boot 3.x** | A Java framework for building REST APIs | Powers the backend server and data endpoints |
| **Maven** | A Java build and dependency management tool | Compiles Java code and packages it into a `.jar` file |
| **Docker** | A containerization platform | Packages apps with all dependencies into portable containers |
| **Docker Compose** | A tool for running multi-container Docker apps | Runs both the frontend and backend containers together |
| **Nginx** | A high-performance web server | Serves the React app and proxies API requests to Spring Boot |
| **GitHub** | A cloud-based code repository | Stores your source code and triggers the pipeline |
| **AWS CodePipeline** | AWS's CI/CD orchestration service | Connects GitHub, CodeBuild, and CodeDeploy into a workflow |
| **AWS CodeBuild** | AWS's managed build service | Compiles and tests your code in the cloud |
| **AWS CodeDeploy** | AWS's automated deployment service | Pushes your compiled code to EC2 servers |
| **Amazon EC2** | AWS's virtual machine service | The server where your application runs |
| **Amazon S3** | AWS's object storage service | Stores the compiled artifact between Build and Deploy stages |
| **AWS IAM** | AWS's identity and access management | Controls which services can talk to which other services |

---

## 3. How the CI/CD Pipeline Works

CI/CD stands for **Continuous Integration** and **Continuous Deployment**. It is the practice of automatically building, testing, and deploying code every time a developer pushes a change.

### Stage 1: Source (GitHub → CodePipeline)

When you push code to your GitHub repository's `main` branch, GitHub sends a notification (called a "webhook") to AWS CodePipeline. CodePipeline wakes up, downloads a copy of your source code, and stores it in an S3 bucket. This triggers the next stage.

### Stage 2: Build (CodeBuild)

CodePipeline hands the source code to AWS CodeBuild. CodeBuild spins up a temporary Linux server (using the `aws/codebuild/standard:7.0` image, which has Java 17 and Node.js 20 pre-installed) and executes the instructions in your `buildspec.yml` file:

1. It runs `mvn clean package` inside the `backend/` directory, which compiles all Java files and produces `cicd-backend.jar`.
2. It runs `npm install && npm run build` inside the `frontend/` directory, which compiles all React JSX files and produces a `dist/` folder containing plain HTML, CSS, and JavaScript.
3. It gathers the `.jar` file, the `dist/` folder, the Dockerfiles, the Nginx config, the `docker-compose.yml`, and the deployment scripts into a single folder called `deploy_artifacts/`.
4. CodeBuild zips the `deploy_artifacts/` folder and uploads it to S3.

### Stage 3: Deploy (CodeDeploy → EC2)

CodePipeline triggers CodeDeploy with the S3 artifact location. CodeDeploy connects to your EC2 instance (via the CodeDeploy agent running on it) and executes the instructions in your `appspec.yml` file:

1. **BeforeInstall**: Runs `before_install.sh` — installs Docker and Docker Compose if not present, and cleans up the previous deployment.
2. **Install**: CodeDeploy copies all files from the artifact to `/home/ec2-user/app/` on the EC2 instance.
3. **AfterInstall**: Runs `after_install.sh` — sets correct file permissions.
4. **ApplicationStart**: Runs `start_server.sh` — executes `docker-compose up -d --build`, which builds Docker images from the Dockerfiles and starts both containers.
5. **ValidateService**: Runs `validate_service.sh` — waits 15 seconds, then calls `http://localhost:8080/api/health` to confirm the backend is running. If it gets a 200 OK response, the deployment is marked as **Succeeded**.

---

## 4. What the Application Does

The application is a demonstration of the AWS CI/CD pipeline itself. It has a clean, dark-themed UI with three main sections:

**Section 1 — Technology Stack Display**: Shows all the technologies used in the project (React, Spring Boot, Docker, etc.) as styled tags.

**Section 2 — Backend API Health Monitor**: Displays the real-time health status of the Spring Boot backend, including its version, environment, and current timestamp. This data is fetched live from the `/api/health` endpoint. There is a "Refresh Health" button to re-fetch the status.

**Section 3 — Items from Backend**: When you click "Fetch Items", the React app calls the `/api/items` endpoint and displays the list of items returned by the Spring Boot service. This demonstrates a real frontend-to-backend API call.

**Section 4 — Pipeline Stages Info**: A visual explanation of the three CI/CD pipeline stages (Source, Build, Deploy) with descriptions.

### Backend REST API Endpoints

| Method | Endpoint | Description | Example Response |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Health check for the service | `{"status":"UP","version":"1.0.0"}` |
| `GET` | `/api/items` | Returns a list of all items | `[{"id":1,"name":"AWS CodePipeline",...}]` |
| `GET` | `/api/items/{id}` | Returns a single item by its ID | `{"id":1,"name":"AWS CodePipeline",...}` |
| `POST` | `/api/echo` | Echoes back the request body | `{"yourKey":"yourValue","echo":true}` |

---

## 5. Understanding Dockerization

Docker solves the classic "it works on my machine" problem. When you package an application into a Docker container, it includes the application code AND everything it needs to run (the Java runtime, the Nginx web server, etc.). This means the container will behave identically on any machine — your laptop, a colleague's computer, or an AWS server.

### Key Docker Concepts

A **Dockerfile** is a recipe for building a Docker image. An **image** is a snapshot of an application and its environment. A **container** is a running instance of an image.

**Docker Compose** is a tool that lets you define and run multiple containers together. In our project, we have two containers: one for the React frontend (served by Nginx) and one for the Spring Boot backend. Docker Compose connects them on a shared private network so Nginx can forward API requests to Spring Boot.

### Why We Use Pre-Built Artifacts

Our Dockerfiles are intentionally simple because CodeBuild does the heavy compilation work. This is a best practice in CI/CD:

- **CodeBuild** is a powerful, temporary server with lots of CPU and RAM. It is ideal for compilation.
- **EC2 t2.micro** is a small, always-on server. Compiling Java or building a React app on it would be very slow and could run out of memory.

So our workflow is: **CodeBuild compiles → Docker just runs**.

The backend Dockerfile simply takes the pre-built `cicd-backend.jar` and wraps it in a lightweight Java runtime image. The frontend Dockerfile takes the pre-built `dist/` folder and wraps it in a lightweight Nginx image.

---

## 6. Understanding Every Configuration File

### `buildspec.yml` — The Build Recipe

```yaml
version: 0.2
phases:
  install:
    runtime-versions:
      java: corretto17   # Install Java 17
      nodejs: 20         # Install Node.js 20
    commands:
      - cd $CODEBUILD_SRC_DIR/backend && mvn clean install -DskipTests -B -q
      - cd $CODEBUILD_SRC_DIR/frontend && npm install --silent
  pre_build:
    commands:
      - cd $CODEBUILD_SRC_DIR/backend && mvn test -B -q   # Run unit tests
  build:
    commands:
      - cd $CODEBUILD_SRC_DIR/backend && mvn clean package -DskipTests -B -q
      - cd $CODEBUILD_SRC_DIR/frontend && npm run build
  post_build:
    commands:
      # Gather all deployment artifacts into one folder
      - mkdir -p deploy_artifacts/backend deploy_artifacts/frontend deploy_artifacts/scripts
      - cp backend/target/cicd-backend.jar deploy_artifacts/backend/
      - cp backend/Dockerfile deploy_artifacts/backend/
      - cp -r frontend/dist deploy_artifacts/frontend/
      - cp frontend/Dockerfile deploy_artifacts/frontend/
      - cp frontend/nginx.conf deploy_artifacts/frontend/
      - cp docker-compose.yml deploy_artifacts/
      - cp appspec.yml deploy_artifacts/
      - cp -r scripts/. deploy_artifacts/scripts/
artifacts:
  files:
    - '**/*'
  base-directory: deploy_artifacts   # Only package this folder as the artifact
```

### `appspec.yml` — The Deployment Recipe

```yaml
version: 0.0
os: linux
files:
  - source: /                          # Copy everything from the artifact
    destination: /home/ec2-user/app    # To this folder on the EC2 instance
    overwrite: true
hooks:
  BeforeInstall:
    - location: scripts/before_install.sh
      timeout: 300    # Script must complete within 5 minutes
      runas: root
  AfterInstall:
    - location: scripts/after_install.sh
      timeout: 300
      runas: root
  ApplicationStart:
    - location: scripts/start_server.sh
      timeout: 300
      runas: root
  ValidateService:
    - location: scripts/validate_service.sh
      timeout: 300
      runas: root
```

### `docker-compose.yml` — The Container Orchestration

```yaml
version: '3.8'
services:
  backend:
    build:
      context: ./backend     # Build image using backend/Dockerfile
    container_name: cicd-backend
    ports:
      - "8080:8080"          # Map EC2 port 8080 to container port 8080
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8080/api/health"]
      interval: 30s
      start_period: 60s      # Give Spring Boot 60 seconds to start up

  frontend:
    build:
      context: ./frontend    # Build image using frontend/Dockerfile
    container_name: cicd-frontend
    ports:
      - "80:80"              # Map EC2 port 80 to container port 80
    depends_on:
      backend:
        condition: service_healthy   # Wait for backend to be healthy before starting
    networks:
      - app-network

networks:
  app-network:
    driver: bridge           # Both containers share this private network
```

### `frontend/nginx.conf` — The Web Server Configuration

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Forward /api/ requests to the Spring Boot backend
    location /api/ {
        proxy_pass http://backend:8080/api/;   # "backend" is the Docker service name
    }

    # For all other routes, serve the React SPA
    location / {
        try_files $uri $uri/ /index.html;      # Enables React Router navigation
    }
}
```

---

## Part A: Setting Up GitHub

### Step A1: Create a GitHub Account (if you don't have one)

1. Open your browser and go to [https://github.com](https://github.com).
2. Click the **Sign up** button in the top right corner.
3. Enter your email address, create a password, and choose a username.
4. Verify your email address.

### Step A2: Create a New Repository

1. Once logged in, click the **+** icon in the top right corner.
2. Select **New repository**.
3. In the "Repository name" field, type: `react-springboot-cicd`
4. Leave it as **Public**.
5. Do **not** check "Add a README file".
6. Click **Create repository**.

### Step A3: Create a Personal Access Token

AWS CodePipeline needs permission to read your repository and receive webhook notifications.

1. Click on your profile picture in the top right corner.
2. Click **Settings**.
3. Scroll down the left sidebar and click **Developer settings** (at the very bottom).
4. Click **Personal access tokens** > **Tokens (classic)**.
5. Click **Generate new token** > **Generate new token (classic)**.
6. In the "Note" field, type: `AWS CodePipeline Access`
7. Set the expiration to **90 days** (or "No expiration" for a sandbox).
8. Check the following scopes:
   - `repo` (the entire "repo" checkbox — this selects all sub-items)
   - `admin:repo_hook`
9. Scroll to the bottom and click **Generate token**.
10. **IMPORTANT**: Copy the token immediately and save it somewhere safe. GitHub will never show it again.

### Step A4: Push the Project Code to GitHub

1. Download the `aws-cicd-project.zip` file from this guide's attachments.
2. Extract the zip file to a folder on your computer.
3. Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux).
4. Navigate to the extracted folder:
   ```bash
   cd path/to/aws-cicd-project
   ```
5. Run the following commands one by one:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: React + Spring Boot CI/CD project"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/react-springboot-cicd.git
   git push -u origin main
   ```
   When prompted for a password, use your **Personal Access Token** (not your GitHub password).

6. Refresh your GitHub repository page. You should see all the project files listed.

---

## Part B: Configuring the AWS CLI

The AWS CLI (Command Line Interface) lets you control AWS from a terminal. We will use it to create the pipeline infrastructure.

### Step B1: Get Your Whizlabs Credentials

1. Log in to your Whizlabs account and start your AWS Sandbox.
2. On the sandbox page, you will find:
   - **AWS Console URL** — the link to the AWS web console
   - **Access Key ID** — starts with `AKIA...`
   - **Secret Access Key** — a long random string
   - **Region** — typically `us-east-1`

### Step B2: Open AWS CloudShell

Rather than installing the AWS CLI on your local computer, we will use AWS CloudShell — a browser-based terminal that is already authenticated.

1. Open the AWS Console using the URL from Whizlabs.
2. Look for the **CloudShell** icon in the top navigation bar (it looks like a terminal prompt `>_`).
3. Click it. A terminal window will open at the bottom of the screen.
4. Wait about 30 seconds for it to initialize.

### Step B3: Configure the AWS CLI in CloudShell

Type the following commands in the CloudShell terminal, pressing Enter after each one:

```bash
aws configure set aws_access_key_id YOUR_ACCESS_KEY_ID
aws configure set aws_secret_access_key YOUR_SECRET_ACCESS_KEY
aws configure set default.region us-east-1
aws configure set default.output json
```

Verify it works:
```bash
aws sts get-caller-identity
```

You should see a JSON response with your Account ID and user ARN. If you see an error, double-check that you copied the credentials correctly.

---

## Part C: Creating AWS Infrastructure

We will now create the EC2 instance (the server where the app will run) and the IAM roles (permissions for AWS services to talk to each other).

### Step C1: Create an EC2 Key Pair

A Key Pair is like a password for SSH (remote terminal access) to your EC2 instance.

1. In the AWS Console, use the search bar at the top to search for **EC2**.
2. Click on **EC2** to open the EC2 Dashboard.
3. In the left sidebar, under "Network & Security", click **Key Pairs**.
4. Click the orange **Create key pair** button.
5. Fill in the form:
   - **Name**: `cicd-keypair`
   - **Key pair type**: RSA
   - **Private key file format**: `.pem`
6. Click **Create key pair**.
7. A `.pem` file will automatically download to your computer. Save it somewhere you can find it (e.g., your Desktop or Downloads folder).

### Step C2: Create a Security Group

A Security Group is a firewall that controls what traffic is allowed in and out of your EC2 instance.

1. In the EC2 Dashboard left sidebar, under "Network & Security", click **Security Groups**.
2. Click **Create security group**.
3. Fill in:
   - **Security group name**: `react-app-sg`
   - **Description**: `Security group for React Spring Boot app`
4. Under "Inbound rules", click **Add rule** twice to add:
   - Rule 1: Type = `SSH`, Source = `Anywhere-IPv4` (0.0.0.0/0)
   - Rule 2: Type = `HTTP`, Source = `Anywhere-IPv4` (0.0.0.0/0)
5. Click **Create security group**.
6. Note the **Security group ID** (it looks like `sg-0xxxxxxxx`).

### Step C3: Launch the EC2 Instance

1. In the EC2 Dashboard, click the orange **Launch instance** button.
2. Fill in the configuration:
   - **Name**: `react-app-server`
   - **Application and OS Images**: Click "Amazon Linux", then select **Amazon Linux 2 AMI (HVM)** (make sure it says "Amazon Linux 2", NOT "Amazon Linux 2023").
   - **Instance type**: `t2.micro`
   - **Key pair**: Select `cicd-keypair` from the dropdown.
   - **Network settings**: Click "Select existing security group" and choose `react-app-sg`.
3. Expand **Advanced details** at the bottom.
4. In the **User data** field, paste the following script. This script runs automatically the first time the instance starts and installs the CodeDeploy agent:

```bash
#!/bin/bash
yum update -y
yum install -y ruby wget

# Install Docker
amazon-linux-extras install docker -y
service docker start
usermod -a -G docker ec2-user
chkconfig docker on

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install CodeDeploy Agent
cd /home/ec2-user
wget https://aws-codedeploy-us-east-1.s3.us-east-1.amazonaws.com/latest/install
chmod +x ./install
./install auto
service codedeploy-agent start
chkconfig codedeploy-agent on
```

5. Click **Launch instance**.
6. Click **View all instances**.
7. Wait for the **Instance state** to change from "Pending" to **Running** and the **Status check** to show "2/2 checks passed". This takes about 2-3 minutes.
8. Once running, note the **Public IPv4 address** (e.g., `3.90.216.132`). This will be your app's URL.

### Step C4: Create IAM Roles

IAM Roles give AWS services permission to perform actions. We need four roles. Run the following commands in AWS CloudShell:

```bash
# --- Role 1: For CodeBuild (permission to read S3 and write logs) ---
aws iam create-role \
  --role-name CodeBuildRole-CICD \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"codebuild.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

aws iam attach-role-policy \
  --role-name CodeBuildRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess

aws iam attach-role-policy \
  --role-name CodeBuildRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name CodeBuildRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

# --- Role 2: For CodeDeploy (permission to deploy to EC2) ---
aws iam create-role \
  --role-name CodeDeployRole-CICD \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"codedeploy.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

aws iam attach-role-policy \
  --role-name CodeDeployRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployFullAccess

aws iam attach-role-policy \
  --role-name CodeDeployRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

# --- Role 3: For CodePipeline (permission to orchestrate all services) ---
aws iam create-role \
  --role-name CodePipelineRole-CICD \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"codepipeline.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }'

aws iam attach-role-policy \
  --role-name CodePipelineRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/AWSCodePipeline_FullAccess

aws iam attach-role-policy \
  --role-name CodePipelineRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess

aws iam attach-role-policy \
  --role-name CodePipelineRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeBuildAdminAccess

aws iam attach-role-policy \
  --role-name CodePipelineRole-CICD \
  --policy-arn arn:aws:iam::aws:policy/AWSCodeDeployFullAccess
```

Verify the roles were created:
```bash
aws iam list-roles --query 'Roles[?contains(RoleName,`CICD`)].RoleName' --output table
```

You should see all three roles listed.

### Step C5: Create an S3 Bucket for Artifacts

CodeBuild stores compiled artifacts in S3, and CodeDeploy reads from there.

```bash
# Replace 502244393028 with your actual Account ID from Step B3
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="cicd-artifacts-${ACCOUNT_ID}-us-east-1"

aws s3 mb s3://$BUCKET --region us-east-1
echo "Bucket created: $BUCKET"
```

---

## Part D: Setting Up the CI/CD Pipeline

Now we create the three core CI/CD services: CodeBuild, CodeDeploy, and CodePipeline.

### Step D1: Create the CodeBuild Project

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="cicd-artifacts-${ACCOUNT_ID}-us-east-1"

aws codebuild create-project \
  --name react-springboot-build \
  --source '{"type":"CODEPIPELINE","buildspec":"buildspec.yml"}' \
  --artifacts "{\"type\":\"S3\",\"location\":\"${BUCKET}\",\"packaging\":\"ZIP\"}" \
  --environment '{
    "type":"LINUX_CONTAINER",
    "image":"aws/codebuild/standard:7.0",
    "computeType":"BUILD_GENERAL1_SMALL",
    "environmentVariables":[]
  }' \
  --service-role "arn:aws:iam::${ACCOUNT_ID}:role/CodeBuildRole-CICD"
```

### Step D2: Create the CodeDeploy Application and Deployment Group

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create the CodeDeploy application
aws deploy create-application \
  --application-name react-springboot-app \
  --compute-platform Server

# Create the deployment group
# This tells CodeDeploy to deploy to instances tagged with Name=react-springboot-app
aws deploy create-deployment-group \
  --application-name react-springboot-app \
  --deployment-group-name react-springboot-deployment-group \
  --service-role-arn "arn:aws:iam::${ACCOUNT_ID}:role/CodeDeployRole-CICD" \
  --ec2-tag-filters '[{"Key":"Name","Value":"react-springboot-app","Type":"KEY_AND_VALUE"}]' \
  --on-premises-instance-tag-filters '[{"Key":"Name","Value":"react-springboot-app","Type":"KEY_AND_VALUE"}]' \
  --deployment-config-name CodeDeployDefault.AllAtOnce \
  --auto-rollback-configuration '{"enabled":true,"events":["DEPLOYMENT_FAILURE"]}'
```

### Step D3: Create the CodePipeline

Save the following as a file called `pipeline.json` in CloudShell:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET="cicd-artifacts-${ACCOUNT_ID}-us-east-1"

# Replace YOUR_GITHUB_USERNAME and YOUR_GITHUB_TOKEN with your actual values
GITHUB_USER="YOUR_GITHUB_USERNAME"
GITHUB_TOKEN="YOUR_GITHUB_TOKEN"

cat > /tmp/pipeline.json << EOF
{
  "pipeline": {
    "name": "react-springboot-pipeline",
    "roleArn": "arn:aws:iam::${ACCOUNT_ID}:role/CodePipelineRole-CICD",
    "artifactStore": {
      "type": "S3",
      "location": "${BUCKET}"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [{
          "name": "GitHub_Source",
          "actionTypeId": {
            "category": "Source",
            "owner": "ThirdParty",
            "provider": "GitHub",
            "version": "1"
          },
          "configuration": {
            "Owner": "${GITHUB_USER}",
            "Repo": "react-springboot-cicd",
            "Branch": "main",
            "OAuthToken": "${GITHUB_TOKEN}",
            "PollForSourceChanges": "true"
          },
          "outputArtifacts": [{"name": "SourceArtifact"}]
        }]
      },
      {
        "name": "Build",
        "actions": [{
          "name": "CodeBuild",
          "actionTypeId": {
            "category": "Build",
            "owner": "AWS",
            "provider": "CodeBuild",
            "version": "1"
          },
          "configuration": {
            "ProjectName": "react-springboot-build"
          },
          "inputArtifacts": [{"name": "SourceArtifact"}],
          "outputArtifacts": [{"name": "BuildArtifact"}]
        }]
      },
      {
        "name": "Deploy",
        "actions": [{
          "name": "CodeDeploy",
          "actionTypeId": {
            "category": "Deploy",
            "owner": "AWS",
            "provider": "CodeDeploy",
            "version": "1"
          },
          "configuration": {
            "ApplicationName": "react-springboot-app",
            "DeploymentGroupName": "react-springboot-deployment-group"
          },
          "inputArtifacts": [{"name": "BuildArtifact"}]
        }]
      }
    ]
  }
}
EOF

aws codepipeline create-pipeline --cli-input-json file:///tmp/pipeline.json
echo "Pipeline created successfully!"
```

---

## Part E: The Whizlabs Sandbox Workaround

> **Why is this section needed?** The Whizlabs Sandbox has strict IAM restrictions. Normally, you would attach an IAM Role directly to an EC2 instance (called an "Instance Profile"), which gives the CodeDeploy agent on the instance permission to communicate with AWS. However, the sandbox blocks the `iam:CreateInstanceProfile` action. We work around this by registering the EC2 instance as an "on-premises" server and providing explicit credentials.

### Step E1: Register the Instance with CodeDeploy

Run in CloudShell:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
WHIZ_USER_ARN=$(aws sts get-caller-identity --query Arn --output text)

echo "Your user ARN is: $WHIZ_USER_ARN"

# Register the EC2 instance as an on-premises instance
aws deploy register-on-premises-instance \
  --instance-name react-app-server \
  --iam-user-arn "$WHIZ_USER_ARN"

# Add the tag that the deployment group looks for
aws deploy add-tags-to-on-premises-instances \
  --instance-names react-app-server \
  --tags Key=Name,Value=react-springboot-app

echo "Instance registered successfully!"
```

### Step E2: Configure the CodeDeploy Agent on EC2

Now we need to SSH into the EC2 instance and configure the agent with credentials.

1. First, find your EC2 instance's public IP address:
   - Go to EC2 Dashboard > Instances.
   - Click on your `react-app-server` instance.
   - Copy the **Public IPv4 address**.

2. Open a terminal on your local computer (or use CloudShell).

3. If using your local terminal, run:
   ```bash
   # Make the key file secure (required on Mac/Linux)
   chmod 400 /path/to/cicd-keypair.pem
   
   # SSH into the instance (replace 3.90.216.132 with your actual IP)
   ssh -i /path/to/cicd-keypair.pem ec2-user@3.90.216.132
   ```

   If using CloudShell, you first need to upload your `.pem` file:
   - Click the **Actions** menu in CloudShell.
   - Select **Upload file** and upload your `cicd-keypair.pem` file.
   - Then run:
   ```bash
   chmod 400 ~/cicd-keypair.pem
   ssh -i ~/cicd-keypair.pem -o StrictHostKeyChecking=no ec2-user@3.90.216.132
   ```

4. Once connected to the EC2 instance, run the following commands, replacing the values with your actual Whizlabs credentials:

```bash
# Create the on-premises configuration file for the CodeDeploy agent
sudo bash -c 'cat > /etc/codedeploy-agent/conf/codedeploy.onpremises.yml << EOF
---
aws_access_key_id: YOUR_ACCESS_KEY_ID
aws_secret_access_key: YOUR_SECRET_ACCESS_KEY
iam_user_arn: YOUR_WHIZ_USER_ARN
region: us-east-1
EOF'

# Remove the old agent config to force it to use the new one
sudo sed -i '/aws_credentials_file/d' /etc/codedeploy-agent/conf/codedeployagent.yml

# Restart the CodeDeploy agent
sudo service codedeploy-agent restart

# Wait 5 seconds and check the logs
sleep 5
sudo tail -10 /var/log/aws/codedeploy-agent/codedeploy-agent.log
```

5. Look for lines that say `poll_host_command` with `200` in the log output. This means the agent is successfully communicating with AWS. If you see `AccessDeniedException`, double-check your credentials.

6. Type `exit` to disconnect from the EC2 instance.

---

## Part F: Running and Verifying the Pipeline

### Step F1: Trigger the Pipeline

1. In the AWS Console, search for **CodePipeline** in the top search bar.
2. Click on **CodePipeline** to open the service.
3. You should see `react-springboot-pipeline` listed.
4. Click on the pipeline name to open it.
5. Click the orange **Release change** button in the top right corner.
6. Click **Release** in the confirmation dialog.

### Step F2: Monitor the Pipeline

The pipeline will now run through three stages. You can watch the progress in real time.

| Stage | What You See | How Long It Takes |
| :--- | :--- | :--- |
| **Source** | "In progress" then "Succeeded" | ~10 seconds |
| **Build** | "In progress" for a while | ~5-7 minutes (Maven downloads dependencies) |
| **Deploy** | "In progress" then "Succeeded" | ~2-3 minutes |

**If any stage fails**, click the **Details** link next to that stage to see the error logs.

### Step F3: Verify the Deployment

Once all three stages show a green **Succeeded** status:

1. Go to EC2 Dashboard > Instances.
2. Click on `react-app-server`.
3. Copy the **Public IPv4 address**.
4. Open a new browser tab and type: `http://YOUR_EC2_IP_ADDRESS`

You should see the React application's homepage with the "AWS CI/CD Pipeline Demo" title.

5. Click the **Refresh Health** button. You should see the backend health status appear.
6. Click the **Fetch Items** button. You should see a list of 8 items returned from the Spring Boot API.

### Step F4: Verify the API Directly

You can also test the backend API directly in your browser:

- Health check: `http://YOUR_EC2_IP/api/health`
- Items list: `http://YOUR_EC2_IP/api/items`

---

## Part G: Testing the CI/CD Loop

This is the most satisfying part — seeing the automation work.

### Step G1: Make a Code Change

1. On your local computer, open the file `frontend/src/App.jsx`.
2. Find the line that says `AWS CI/CD Pipeline Demo` (near the top of the file).
3. Change it to something like `My First Live CI/CD App`.
4. Save the file.

### Step G2: Push the Change

```bash
git add frontend/src/App.jsx
git commit -m "Update app title to test CI/CD pipeline"
git push origin main
```

### Step G3: Watch the Magic

1. Go back to CodePipeline in the AWS Console.
2. Within about 30 seconds, you will see the pipeline automatically start running again. You did not click anything — GitHub sent a webhook notification to AWS.
3. Wait for all three stages to complete (~8 minutes).
4. Refresh your browser tab with the EC2 IP address.
5. The page title will now show your new text.

This is CI/CD in action: **you changed one line of code, pushed it, and the live server updated itself automatically**.

---

## Troubleshooting Reference

### The Build Stage Fails

**Symptom**: The Build stage turns red with "Failed".

**How to investigate**:
1. Click **Details** on the Build stage.
2. Click **Link to execution details** to open the CodeBuild log.
3. Scroll to the bottom of the log to find the error.

**Common causes**:
- `mvn: command not found` — The `buildspec.yml` `runtime-versions` section is missing or incorrect.
- `COPY pom.xml .` fails — The `buildspec.yml` is not navigating to the correct directory before running Maven.
- `npm: command not found` — Node.js version not specified in `runtime-versions`.

### The Deploy Stage Fails at ApplicationStart

**Symptom**: The Deploy stage fails, and the lifecycle event shows `ApplicationStart: Failed - exit code 17`.

**Cause**: Docker Compose is failing to build or start the containers.

**How to investigate**:
```bash
ssh -i cicd-keypair.pem ec2-user@YOUR_EC2_IP
cd /home/ec2-user/app
sudo docker-compose logs
```

**Common causes**:
- The `cicd-backend.jar` file is missing from the `backend/` directory — check the `buildspec.yml` post_build section.
- The `dist/` folder is missing from the `frontend/` directory — same cause.
- Docker ran out of memory on the t2.micro instance — this can happen if the Dockerfile tries to compile Java on the EC2 instance instead of using the pre-built JAR.

### The Deploy Stage Hangs Then Fails (No Instances)

**Symptom**: The Deploy stage stays "In Progress" for a long time, then fails with "No instances found".

**Cause**: The CodeDeploy deployment group cannot find any instances matching the tag `Name=react-springboot-app`.

**How to fix**:
1. Verify the EC2 instance has the correct tag (EC2 > Instances > select instance > Tags tab).
2. Verify the on-premises instance is registered: `aws deploy get-on-premises-instance --instance-name react-app-server`
3. Verify the on-premises instance has the correct tag: the `tags` array should contain `{"Key":"Name","Value":"react-springboot-app"}`.

### The CodeDeploy Agent Shows AccessDeniedException

**Symptom**: SSH into EC2 and check the log: `sudo tail -20 /var/log/aws/codedeploy-agent/codedeploy-agent.log`. You see `AccessDeniedException`.

**Cause**: The credentials in the on-premises config file are incorrect or the IAM user does not have CodeDeploy permissions.

**How to fix**:
1. Double-check the credentials in `/etc/codedeploy-agent/conf/codedeploy.onpremises.yml`.
2. Verify the IAM user ARN matches exactly: `aws sts get-caller-identity`.
3. Restart the agent: `sudo service codedeploy-agent restart`.

---

## Glossary

| Term | Definition |
| :--- | :--- |
| **CI/CD** | Continuous Integration / Continuous Deployment — the practice of automatically building, testing, and deploying code |
| **Pipeline** | A series of automated steps that transform source code into a running application |
| **Artifact** | A compiled, packaged version of your application ready for deployment |
| **Docker Image** | A snapshot of an application and its environment, used to create containers |
| **Docker Container** | A running instance of a Docker image |
| **EC2** | Elastic Compute Cloud — AWS's virtual machine service |
| **IAM Role** | A set of AWS permissions that can be assigned to a service |
| **Security Group** | A virtual firewall that controls traffic to/from an EC2 instance |
| **Webhook** | An automatic HTTP notification sent from GitHub to AWS when you push code |
| **buildspec.yml** | A YAML file that tells CodeBuild how to compile your application |
| **appspec.yml** | A YAML file that tells CodeDeploy how to deploy your application |
| **Nginx** | A web server used to serve static files and proxy API requests |
| **Maven** | A Java build tool that compiles code and manages dependencies |
| **Vite** | A JavaScript build tool that compiles React JSX into plain HTML/JS |
| **JAR file** | Java ARchive — a compiled, packaged Java application |
| **REST API** | Representational State Transfer API — a standard way for web services to communicate |
| **On-Premises Instance** | In CodeDeploy, a server that is not an EC2 instance but is registered manually |
| **UserData** | A script that runs automatically when an EC2 instance first starts |

---

*Guide authored by Manus AI. Tested and verified on Whizlabs AWS Sandbox (Account: 502244393028, Region: us-east-1, March 2026).*
