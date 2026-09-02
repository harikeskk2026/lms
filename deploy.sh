#!/usr/bin/env bash
# CareerLabs LMS (lms.careerlabs.academy) deploy pipeline.
# Deploys only api/ (Spring Boot) and frontend/ (Next.js) — backend/ (Node) is intentionally skipped.
set -euo pipefail

REPO_DIR="/home/careerlabs.academy/public_html/lms.careerlabs.academy"
LOG_FILE="$REPO_DIR/deploy.log"
LOCK_FILE="$REPO_DIR/deploy.lock"
JAVA21_HOME="/usr/lib/jvm/java-21-openjdk-21.0.11.0.10-2.el9.alma.1.x86_64"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "Another deploy is already running (lock held on $LOCK_FILE). Aborting."
  exit 1
fi

{
echo "===== Deploy started: $(date -u +'%Y-%m-%dT%H:%M:%SZ') ====="

cd "$REPO_DIR"

echo "--- Checking working tree is clean ---"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "ABORT: working tree has uncommitted changes. Refusing to pull over them:"
  git status --porcelain
  exit 1
fi

echo "--- git pull (testing) ---"
git fetch origin testing
git pull origin testing
echo "Now at: $(git log -1 --oneline)"

echo "--- Backend build (api, Java 21, skip tests) ---"
export JAVA_HOME="$JAVA21_HOME"
export PATH="$JAVA_HOME/bin:$PATH"
cd "$REPO_DIR/api"
mvn -q -DskipTests package

echo "--- Frontend build ---"
cd "$REPO_DIR/frontend"
npm ci
npm run build
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/static

echo "--- Restarting lms-api ---"
pm2 restart lms-api
sleep 2

echo "--- Restarting lms-frontend ---"
pm2 restart lms-frontend
sleep 2

pm2 jlist > /tmp/lms_deploy_jlist.json
node -e "
const apps=JSON.parse(require('fs').readFileSync('/tmp/lms_deploy_jlist.json','utf8'));
['lms-api','lms-frontend'].forEach(n=>{
  const p=apps.find(a=>a.name===n);
  console.log(n+':', p ? p.pm2_env.status+' restarts='+p.pm2_env.restart_time : 'NOT FOUND');
});
"
rm -f /tmp/lms_deploy_jlist.json

echo "===== Deploy finished: $(date -u +'%Y-%m-%dT%H:%M:%SZ') — check https://lms.careerlabs.academy/api/health ====="
} 2>&1 | tee -a "$LOG_FILE"
