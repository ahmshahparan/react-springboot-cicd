#!/bin/bash
# Deploy the CloudFormation stack for the CI/CD pipeline
# Usage: bash deploy_cloudformation.sh

set -e

# ─── Configuration — Edit these values ───────────────────────────────────────
STACK_NAME="react-springboot-cicd"
REGION="us-east-1"
GITHUB_OWNER="YOUR_GITHUB_USERNAME"
GITHUB_REPO="react-springboot-cicd"
GITHUB_BRANCH="main"
GITHUB_TOKEN="YOUR_GITHUB_PERSONAL_ACCESS_TOKEN"
EC2_KEY_PAIR="YOUR_EC2_KEY_PAIR_NAME"
EC2_INSTANCE_TYPE="t3.small"
# ─────────────────────────────────────────────────────────────────────────────

echo "Deploying CloudFormation stack: $STACK_NAME"
echo "Region: $REGION"

aws cloudformation deploy \
  --template-file cloudformation/pipeline.yml \
  --stack-name $STACK_NAME \
  --region $REGION \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    GitHubOwner=$GITHUB_OWNER \
    GitHubRepo=$GITHUB_REPO \
    GitHubBranch=$GITHUB_BRANCH \
    GitHubToken=$GITHUB_TOKEN \
    EC2KeyPair=$EC2_KEY_PAIR \
    EC2InstanceType=$EC2_INSTANCE_TYPE

echo ""
echo "Stack deployed successfully!"
echo ""
echo "Outputs:"
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $REGION \
  --query "Stacks[0].Outputs[*].[OutputKey, OutputValue]" \
  --output table
