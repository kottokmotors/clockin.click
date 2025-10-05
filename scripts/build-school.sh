#!/usr/bin/env bash
set -euo pipefail

: "${SCHOOLS:?SCHOOLS not set}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID not set}"
: "${AWS_REGION:?AWS_REGION not set}"
: "${ECR_REPO:?ECR_REPO not set}"

SECRET_NAME="${SECRET_NAME:-clockinclick-app-secrets}"
ASSETS_BUCKET="${ASSETS_BUCKET:-clockinclick-school-assets}"
PARALLEL_LIMIT="${PARALLEL_LIMIT:-4}"
CACHE_IMAGE="${CACHE_IMAGE:-${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:build-cache}"

# --- Colors ---
NC='\033[0m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'

timestamp() { date +"%H:%M:%S"; }

log() {
  local school="$1"; local color="$2"; shift 2
  echo -e "${color}[$(timestamp)] [${school}]${NC} $*"
}

echo -e "${CYAN}🏗️  Starting parallel Docker builds for:${NC} $SCHOOLS"
echo -e "${CYAN}🔐 Using secret:${NC} $SECRET_NAME"
echo -e "${CYAN}🪣 Using assets bucket:${NC} $ASSETS_BUCKET"
echo -e "${CYAN}⚙️  Parallel limit:${NC} $PARALLEL_LIMIT"
echo ""

# Attempt to pull build cache
if docker pull "$CACHE_IMAGE" >/dev/null 2>&1; then
  echo -e "${GREEN}✅ Using cached base image${NC}"
else
  echo -e "${YELLOW}ℹ️ No cache image found; cold build${NC}"
fi

# Shared summary tracking
SUMMARY_FILE=$(mktemp)
echo "SCHOOL,STATUS,DURATION" > "$SUMMARY_FILE"

build_school() {
  local school="$1"; local color="$2"
  local start_time=$(date +%s)
  local tmp_dir; tmp_dir=$(mktemp -d)
  local status="SUCCESS"

  rsync -a --exclude='.git' --exclude='node_modules' --exclude='.next' ./ "$tmp_dir/" >/dev/null
  pushd "$tmp_dir" >/dev/null

  local SCHOOL_LOWER; SCHOOL_LOWER=$(echo "$school" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
  local IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}:${SCHOOL_LOWER}-latest"

  log "$school" "$color" "🏫 Building image → ${IMAGE_URI}"

  # --- Secrets ---
  log "$school" "$color" "📦 Fetching secrets..."
  if ! aws secretsmanager get-secret-value \
      --secret-id "$SECRET_NAME" \
      --region "$AWS_REGION" \
      --query 'SecretString' \
      --output text > secrets.json; then
    log "$school" "$RED" "❌ Failed to retrieve secrets"
    status="FAILED"
  else
    jq -r 'to_entries | map("\(.key)=\(.value)") | .[]' secrets.json > .env.production
    rm -f secrets.json
    {
      echo "NEXTAUTH_URL=https://$school.clockin.click"
      echo "SCHOOL_NAME=$school"
    } >> .env.production
    log "$school" "$color" "✅ .env.production ready"
  fi

  # --- Logo ---
  local LOGO_KEY="$school/images/logo.png"
  local LOGO_DEST="public/images/logo.png"
  log "$school" "$color" "🖼️ Downloading logo..."
  if aws s3 cp "s3://${ASSETS_BUCKET}/${LOGO_KEY}" "$LOGO_DEST" --region "$AWS_REGION" 2>/dev/null; then
    log "$school" "$color" "✅ Custom logo applied"
  else
    log "$school" "$color" "ℹ️ Using fallback logo"
  fi

  # --- Build & push ---
  if docker build \
      --build-arg SCHOOL_NAME="$school" \
      --cache-from "$CACHE_IMAGE" \
      --cache-to "type=registry,ref=$CACHE_IMAGE,mode=max" \
      -t "$IMAGE_URI" ./; then
    docker push "$IMAGE_URI"
    log "$school" "$color" "✅ Build & push complete"
  else
    log "$school" "$RED" "❌ Docker build failed"
    status="FAILED"
  fi

  local duration=$(( $(date +%s) - start_time ))
  echo "$school,$status,${duration}s" >> "$SUMMARY_FILE"

  popd >/dev/null
  rm -rf "$tmp_dir"
  log "$school" "$color" "🧼 Cleanup done"

  # Return non-zero if failed
  if [ "$status" = "FAILED" ]; then
    return 1
  fi
}

export -f build_school log timestamp
export AWS_ACCOUNT_ID AWS_REGION ECR_REPO SECRET_NAME ASSETS_BUCKET CACHE_IMAGE SUMMARY_FILE

COLORS=("\033[1;35m" "\033[1;34m" "\033[1;36m" "\033[1;33m" "\033[1;32m" "\033[1;31m")

# --- Run parallel builds with fail-fast ---
FAIL_FAST=0
PIPE=$(mktemp -u)
mkfifo "$PIPE"
exec 3<>"$PIPE"
rm "$PIPE"

for school in $SCHOOLS; do
  read -u 3 || true
  {
    color="${COLORS[$((RANDOM % ${#COLORS[@]}))]}"
    build_school "$school" "$color" || FAIL_FAST=1
    echo >&3
  } &
done

wait
exec 3>&-

# --- Show summary ---
echo ""
echo -e "${CYAN}📊 Build Summary:${NC}"
echo "---------------------------------------------"
column -t -s, "$SUMMARY_FILE" | sed "1 s/^/${YELLOW}/; 1 s/\$/${NC}/"
echo "---------------------------------------------"

# --- GitHub Actions Summary ---
if [ -n "${GITHUB_STEP_SUMMARY-}" ]; then
  echo "## 🧱 Build Summary" >> "$GITHUB_STEP_SUMMARY"
  echo "" >> "$GITHUB_STEP_SUMMARY"
  echo '```' >> "$GITHUB_STEP_SUMMARY"
  column -t -s, "$SUMMARY_FILE" >> "$GITHUB_STEP_SUMMARY"
  echo '```' >> "$GITHUB_STEP_SUMMARY"
fi

# --- Exit with failure if any build failed ---
if [ "$FAIL_FAST" -ne 0 ]; then
  echo -e "${RED}❌ One or more schools failed to build. Exiting.${NC}"
  exit 1
fi

echo -e "${GREEN}🎉 All builds completed successfully!${NC}"
