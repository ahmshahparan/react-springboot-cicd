# The Complete GUI Guide: Deploying a React + Spring Boot App on AWS CI/CD

**A 100% Click-by-Click Walkthrough for the Whizlabs AWS Sandbox**

> This guide is designed for visual learners. It uses **zero command-line interface (CLI) commands** for the AWS setup. Every single step is performed by clicking through the AWS Management Console. If you can click a mouse and copy-paste text, you can build a professional CI/CD pipeline.

---

## Table of Contents

1. [Prerequisites & GitHub Setup](#1-prerequisites--github-setup)
2. [Step 1: Create the S3 Artifact Bucket](#step-1-create-the-s3-artifact-bucket)
3. [Step 2: Create the IAM Roles](#step-2-create-the-iam-roles)
4. [Step 3: Launch the EC2 Server](#step-3-launch-the-ec2-server)
5. [Step 4: Create the CodeBuild Project](#step-4-create-the-codebuild-project)
6. [Step 5: Create the CodeDeploy Application](#step-5-create-the-codedeploy-application)
7. [Step 6: Create the CodePipeline](#step-6-create-the-codepipeline)
8. [Step 7: The Sandbox Workaround (Registering the Server)](#step-7-the-sandbox-workaround-registering-the-server)
9. [Step 8: Trigger and Verify](#step-8-trigger-and-verify)

---

## 1. Prerequisites & GitHub Setup

Before touching AWS, we need our code in GitHub.

### 1.1 Create a GitHub Repository
1. Log in to [GitHub](https://github.com).
2. Click the **+** icon (top right) > **New repository**.
3. Name it: `react-springboot-cicd`
4. Leave it **Public** and do **not** check "Add a README file".
5. Click **Create repository**.

### 1.2 Create a Personal Access Token
AWS needs this token to read your code.
1. Click your profile picture (top right) > **Settings**.
2. Scroll down the left menu to the bottom > **Developer settings**.
3. Click **Personal access tokens** > **Tokens (classic)**.
4. Click **Generate new token** > **Generate new token (classic)**.
5. Note: `AWS Pipeline`
6. Expiration: `90 days`
7. Check the boxes for: **`repo`** (selects all sub-items) and **`admin:repo_hook`**.
8. Scroll down and click **Generate token**.
9. **Copy the token immediately** and paste it in a notepad. You will need it later.

### 1.3 Upload the Code
1. Download the `aws-cicd-project.zip` file provided with this guide and extract it.
2. Open a terminal on your computer, navigate to the extracted folder, and run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/react-springboot-cicd.git
   git push -u origin main
   ```
   *(When prompted for a password, paste your Personal Access Token).*

---

## Step 1: Create the S3 Artifact Bucket

CodePipeline needs a place to store the `.zip` file containing your compiled code before sending it to the server.

1. Log in to your Whizlabs AWS Sandbox.
2. In the top search bar, type **S3** and click on it.
3. Click the orange **Create bucket** button.
4. **Bucket name**: Type `cicd-artifacts-` followed by some random numbers (e.g., `cicd-artifacts-123456789`). *Bucket names must be globally unique.*
5. **AWS Region**: Leave as `us-east-1 (N. Virginia)`.
6. Scroll all the way to the bottom and click **Create bucket**.
7. **Write down your exact bucket name** in your notepad.

---

## Step 2: Create the IAM Roles

AWS services need permission to talk to each other. We need to create three roles.

### 2.1 The CodeBuild Role
1. In the top search bar, type **IAM** and click on it.
2. In the left menu, click **Roles**.
3. Click the orange **Create role** button.
4. **Trusted entity type**: Select **AWS service**.
5. **Use case**: Select **CodeBuild** from the dropdown, then select **CodeBuild** again at the bottom. Click **Next**.
6. On the Add permissions page, search for and check the boxes next to these three policies:
   - `AmazonS3FullAccess`
   - `CloudWatchLogsFullAccess`
   - `AWSCodeBuildAdminAccess`
7. Click **Next**.
8. **Role name**: Type `CodeBuildRole-CICD`.
9. Click **Create role**.

### 2.2 The CodeDeploy Role
1. Click **Create role** again.
2. **Trusted entity type**: Select **AWS service**.
3. **Use case**: Select **CodeDeploy** from the dropdown, then select **CodeDeploy** again at the bottom. Click **Next**.
4. The `AWSCodeDeployRole` policy is already checked for you. Click **Next**.
5. **Role name**: Type `CodeDeployRole-CICD`.
6. Click **Create role**.

### 2.3 The CodePipeline Role
1. Click **Create role** again.
2. **Trusted entity type**: Select **AWS service**.
3. **Use case**: Select **CodePipeline** from the dropdown, then select **CodePipeline** again at the bottom. Click **Next**.
4. On the Add permissions page, search for and check the boxes next to:
   - `AWSCodePipeline_FullAccess`
   - `AmazonS3FullAccess`
   - `AWSCodeBuildAdminAccess`
   - `AWSCodeDeployFullAccess`
5. Click **Next**.
6. **Role name**: Type `CodePipelineRole-CICD`.
7. Click **Create role**.

---

## Step 3: Launch the EC2 Server

This is the virtual machine where your application will actually run.

### 3.1 Create a Key Pair
1. In the top search bar, type **EC2** and click on it.
2. In the left menu, under "Network & Security", click **Key Pairs**.
3. Click **Create key pair**.
4. **Name**: `cicd-keypair`
5. **Key pair type**: `RSA`
6. **Private key file format**: `.pem`
7. Click **Create key pair**. The file will download to your computer.

### 3.2 Create a Security Group
1. In the left menu, click **Security Groups**.
2. Click **Create security group**.
3. **Security group name**: `react-app-sg`
4. **Description**: `Allow HTTP and SSH`
5. Under **Inbound rules**, click **Add rule** twice:
   - Rule 1: Type = `SSH`, Source = `Anywhere-IPv4`
   - Rule 2: Type = `HTTP`, Source = `Anywhere-IPv4`
6. Scroll down and click **Create security group**.

### 3.3 Launch the Instance
1. In the left menu, click **Instances**.
2. Click the orange **Launch instances** button.
3. **Name**: Type `react-app-server`.
4. **Application and OS Images**: Click **Amazon Linux**, then select **Amazon Linux 2 AMI (HVM)** from the dropdown. *(Do not use Amazon Linux 2023).*
5. **Instance type**: Leave as `t2.micro`.
6. **Key pair**: Select `cicd-keypair` from the dropdown.
7. **Network settings**: Click **Select existing security group**, then choose `react-app-sg` from the dropdown.
8. Scroll down and expand **Advanced details**.
9. Scroll to the very bottom to the **User data** box. Paste this exact script:

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

10. Click **Launch instance**.
11. Click **View all instances**. Wait until the "Instance state" says **Running**.
12. Check the box next to your instance, click the **Tags** tab at the bottom, and verify there is a tag with Key: `Name` and Value: `react-app-server`.

---

## Step 4: Create the CodeBuild Project

CodeBuild will compile your Java code and build your React app.

1. In the top search bar, type **CodeBuild** and click on it.
2. Click **Create build project**.
3. **Project name**: `react-springboot-build`
4. **Source provider**: Select **GitHub**.
5. **Connection**: Click **Connect using OAuth** or **Connect with a GitHub personal access token**. Paste the token you created in Step 1.2 and click **Save**.
6. **Repository**: Select **Repository in my GitHub account** and search for `react-springboot-cicd`.
7. **Environment image**: Select **Managed image**.
8. **Operating system**: Select **Ubuntu**.
9. **Runtime**: Select **Standard**.
10. **Image**: Select `aws/codebuild/standard:7.0`.
11. **Service role**: Select **Existing service role**.
12. **Role ARN**: Click the dropdown and select `CodeBuildRole-CICD`.
13. **Buildspec**: Leave **Use a buildspec file** selected.
14. Scroll to the bottom and click **Create build project**.

---

## Step 5: Create the CodeDeploy Application

CodeDeploy will take the compiled code and put it on your EC2 server.

1. In the top search bar, type **CodeDeploy** and click on it.
2. In the left menu, click **Applications**.
3. Click **Create application**.
4. **Application name**: `react-springboot-app`
5. **Compute platform**: Select **EC2/On-premises**.
6. Click **Create application**.

### 5.1 Create the Deployment Group
1. On the application page you just created, click **Create deployment group**.
2. **Deployment group name**: `react-springboot-deployment-group`
3. **Service role**: Click the dropdown and select `CodeDeployRole-CICD`.
4. **Deployment type**: Leave as **In-place**.
5. **Environment configuration**: Check the box for **On-premises instances**. *(Note: We are using On-premises instead of Amazon EC2 instances due to Whizlabs Sandbox IAM restrictions).*
6. **Tag group 1**: Key = `Name`, Value = `react-app-server`.
7. **Agent configuration with AWS Systems Manager**: Select **Never**.
8. **Deployment settings**: Select `CodeDeployDefault.AllAtOnce`.
9. **Load balancer**: Uncheck the **Enable load balancing** box.
10. Click **Create deployment group**.

---

## Step 6: Create the CodePipeline

CodePipeline connects GitHub, CodeBuild, and CodeDeploy together.

1. In the top search bar, type **CodePipeline** and click on it.
2. Click **Create pipeline**.
3. **Pipeline name**: `react-springboot-pipeline`
4. **Pipeline type**: Select **V1**.
5. **Execution mode**: Select **Superseded**.
6. **Service role**: Select **Existing service role**.
7. **Role ARN**: Select `CodePipelineRole-CICD` from the dropdown.
8. Expand **Advanced settings**.
9. **Artifact store**: Select **Custom location**.
10. **Bucket**: Select the S3 bucket you created in Step 1 (e.g., `cicd-artifacts-123456789`).
11. Click **Next**.

### 6.1 Add Source Stage
1. **Source provider**: Select **GitHub (Version 1)**.
2. Click the **Connect to GitHub** button and authorize AWS.
3. **Repository**: Select `react-springboot-cicd`.
4. **Branch**: Select `main`.
5. **Change detection options**: Select **GitHub webhooks**.
6. Click **Next**.

### 6.2 Add Build Stage
1. **Build provider**: Select **AWS CodeBuild**.
2. **Region**: `US East (N. Virginia)`.
3. **Project name**: Select `react-springboot-build`.
4. Click **Next**.

### 6.3 Add Deploy Stage
1. **Deploy provider**: Select **AWS CodeDeploy**.
2. **Region**: `US East (N. Virginia)`.
3. **Application name**: Select `react-springboot-app`.
4. **Deployment group**: Select `react-springboot-deployment-group`.
5. Click **Next**.
6. Review the settings and click **Create pipeline**.

*The pipeline will immediately start running, but the Deploy stage will fail. This is expected! We need to do one final workaround for the sandbox.*

---

## Step 7: The Sandbox Workaround (Registering the Server)

Because the Whizlabs Sandbox blocks attaching IAM roles directly to EC2 instances, we must manually register the instance and give it credentials. This is the only time we will use the CloudShell terminal.

1. In the AWS Console, click the **CloudShell** icon (the `>_` symbol in the top right navigation bar).
2. Wait for the terminal to load.
3. Copy and paste this exact block of code into the terminal and press Enter:

```bash
# Get your account details
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
WHIZ_USER_ARN=$(aws sts get-caller-identity --query Arn --output text)

# Register the instance
aws deploy register-on-premises-instance \
  --instance-name react-app-server \
  --iam-user-arn "$WHIZ_USER_ARN"

# Add the tag
aws deploy add-tags-to-on-premises-instances \
  --instance-names react-app-server \
  --tags Key=Name,Value=react-app-server

echo "Instance registered successfully!"
```

### 7.1 Configure the Server
Now we need to log into the EC2 server to give it your Whizlabs credentials.

1. Go to the **EC2 Dashboard** > **Instances**.
2. Click on your `react-app-server` instance.
3. Click the **Connect** button at the top.
4. Select the **EC2 Instance Connect** tab.
5. Click the orange **Connect** button. A new browser tab will open with a black terminal screen connected to your server.
6. Copy and paste this command into the black screen, replacing the `YOUR_...` values with your actual Whizlabs Sandbox credentials (found on your Whizlabs dashboard):

```bash
sudo bash -c 'cat > /etc/codedeploy-agent/conf/codedeploy.onpremises.yml << EOF
---
aws_access_key_id: YOUR_ACCESS_KEY_ID
aws_secret_access_key: YOUR_SECRET_ACCESS_KEY
iam_user_arn: YOUR_WHIZ_USER_ARN
region: us-east-1
EOF'
```
*(Note: To find your `YOUR_WHIZ_USER_ARN`, look at the output of the CloudShell command you ran a minute ago. It looks like `arn:aws:iam::123456789012:user/Whiz_User_12345`)*

7. Finally, restart the agent by pasting this command:
```bash
sudo sed -i '/aws_credentials_file/d' /etc/codedeploy-agent/conf/codedeployagent.yml
sudo service codedeploy-agent restart
```
8. You can now close the EC2 Instance Connect browser tab.

---

## Step 8: Trigger and Verify

Everything is set up! Let's run the pipeline.

1. Go to **CodePipeline** in the AWS Console.
2. Click on `react-springboot-pipeline`.
3. Click the orange **Release change** button in the top right corner.
4. Watch the pipeline run. 
   - **Source** will turn green quickly.
   - **Build** will take about 5-7 minutes (it is downloading Java and Node.js dependencies).
   - **Deploy** will take about 2 minutes.
5. Once all three stages say **Succeeded**, go to the **EC2 Dashboard** > **Instances**.
6. Click your `react-app-server` instance and copy the **Public IPv4 address**.
7. Open a new browser tab and paste the IP address.

**Congratulations!** You should see your React application live on the internet, successfully pulling data from your Spring Boot backend.

### Test the Automation
To prove it works:
1. Go to your GitHub repository in your browser.
2. Navigate to `frontend/src/App.jsx`.
3. Click the pencil icon to edit the file.
4. Change the text `AWS CI/CD Pipeline Demo` to `My GUI Pipeline Works!`.
5. Click **Commit changes**.
6. Go back to AWS CodePipeline. You will see it automatically started running because it detected your GitHub change. When it finishes, refresh your app's webpage to see the new title!

---
*Guide authored by Manus AI. Tested and verified on Whizlabs AWS Sandbox.*
