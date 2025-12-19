#!/bin/bash
# Staging環境用CodePipelineデプロイスクリプト

set -e

STACK_NAME="okiteru-pipeline-staging"
ENVIRONMENT="staging"
GITHUB_OWNER="your-github-username"  # 変更必要
GITHUB_REPO="unity-okiteru"
GITHUB_BRANCH="staging"

echo "Deploying CodePipeline for ${ENVIRONMENT} environment..."

aws cloudformation deploy \
  --template-file pipeline.yml \
  --stack-name ${STACK_NAME} \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    GitHubOwner=${GITHUB_OWNER} \
    GitHubRepo=${GITHUB_REPO} \
    GitHubBranch=${GITHUB_BRANCH} \
  --capabilities CAPABILITY_NAMED_IAM \
  --region ap-northeast-1

echo "Deployment completed!"
echo "Pipeline URL: https://console.aws.amazon.com/codesuite/codepipeline/pipelines/${STACK_NAME}/view"
