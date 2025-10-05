#!/usr/bin/env bash
set -euo pipefail

# =====================================================
# build-school.sh
# Build and push a Docker image for each school
# =====================================================

# --- Required environment variables ---
: "${SCHOOLS:?SCHOOLS not set}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID not set}"
: "${AWS_REGION:?AWS_REGION not set}"
: "${ECR_REPO:?ECR_REPO not set}"

# --- Optional environment variables ---
SECRET_NAME="${SECRET_NAME:-clockinclick-app-secrets}"
ASSETS_BUCKET="${ASSETS_BUCKET:-clockinclick-school-assets}"

echo "🏗️ Starting Docker builds for schools: $SCHOOLS"
echo "🔐 Using secret: $SECRET_NAME"
echo "🪣 Using assets bucket: $ASSETS_BUCKET"
echo ""

for school in $SCHOOLS; do
  SCHOOL_LOWER=$(echo "$school" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${SCHOOL_LOWER}-latest"

  echo "🏫 Building and pushing Docker image for $school → $IMAGE_URI"
  echo "------------------------------------------------------------"

  # --- 1️⃣ Retrieve secrets and create .env.production ---
  echo "📦 Fetching secrets from AWS Secrets Manager: $SECRET_NAME"
  aws secretsmanager get-secret-value \
    --secret-id "$SECRET_NAME" \
    --region "${AWS_REGION}" \
    --query 'SecretString' \
    --output text > secrets.json

  jq -r 'to_entries | map("\(.key)=\(.value)") | .[]' secrets.json > .env.production
  rm -f secrets.json
  echo "✅ Base .env file created for $school"

  # Append school-specific environment variables
  NEXTAUTH_URL="https://$school.clockin.click"
  echo "NEXTAUTH_URL=$NEXTAUTH_URL" >> .env.production
  echo "SCHOOL_NAME=$school" >> .env.production
  echo "✅ Appended NEXTAUTH_URL and SCHOOL_NAME"
  echo ""

  # --- 2️⃣ Download school logo (with fallback) ---
  LOGO_KEY="${SCHOOL_LOWER}/images/logo.png"
  LOGO_DEST="public/images/logo.png"

  echo "🖼️ Attempting to download logo from s3://${ASSETS_BUCKET}/${LOGO_KEY}"
  if aws s3 cp "s3://${ASSETS_BUCKET}/${LOGO_KEY}" "$LOGO_DEST" --region "${AWS_REGION}" 2>/dev/null; then
    echo "✅ Custom logo found and applied for $school"
  else
    echo "ℹ️ No custom logo found — using fallback logo."
  fi
  echo ""

  # --- 3️⃣ Build & push Docker image ---
  echo "🐳 Building Docker image..."
  docker build -t "$IMAGE_URI" ./

  echo "📤 Pushing image to ECR..."
  docker push "$IMAGE_URI"

  echo "✅ Finished building and pushing image for $school"
  echo ""

  # --- 4️⃣ Cleanup ---
  echo "🧹 Cleaning up build artifacts..."
  rm -f .env.production || true
  git restore public/images/logo.png || true  # restore fallback logo if overwritten
  echo "🧼 Cleanup complete for $school"
  echo ""
done

echo "🎉 All school builds completed successfully!"
