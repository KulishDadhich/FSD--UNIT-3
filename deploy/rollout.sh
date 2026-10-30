#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${IMAGE_BASE:?Set IMAGE_BASE to your lowercase GHCR repository path}"
: "${CANDIDATE_TAG:?Set CANDIDATE_TAG to the tested commit SHA}"
[[ "$CANDIDATE_TAG" =~ ^[a-f0-9]{40}$ ]] || { echo 'Expected commit SHA'; exit 1; }
export STABLE_TAG="$(cat .stable-tag 2>/dev/null || printf '%s' "$CANDIDATE_TAG")"
OLD_TAG="$STABLE_TAG"
mkdir -p nginx
route() {
 cat > nginx/default.conf <<EOF
upstream api { server backend:8080 weight=$1; server candidate:8080 weight=$2; }
server {
 listen 80;
 location /api/ { proxy_pass http://api; }
 location / { proxy_pass http://frontend; }
}
EOF
}
rollback() { export STABLE_TAG="$OLD_TAG"; docker compose up -d backend frontend; echo 'Canary failed; keeping previous stable release'; route 100 1; sed -i 's/server candidate:8080 weight=1;/server candidate:8080 down;/' nginx/default.conf; docker compose exec -T gateway nginx -s reload || true; docker compose stop candidate; }
route 90 10
docker compose pull
docker compose up -d postgres kafka backend frontend candidate
# Probe candidate before admitting any user traffic.
for i in $(seq 1 40); do
 if docker compose run --rm --no-deps --entrypoint wget gateway -qO- http://candidate:8080/actuator/health | grep -q '"status":"UP"'; then break; fi
 if [ "$i" = 40 ]; then rollback; exit 1; fi
 sleep 3
done
docker compose up -d gateway
docker compose exec -T gateway nginx -s reload
trap rollback ERR
# Exercise the candidate during the canary window; stop immediately on a failing health probe.
for i in $(seq 1 12); do
 docker compose exec -T gateway wget -qO- http://candidate:8080/actuator/health | grep -q '"status":"UP"'
 sleep 5
done
export STABLE_TAG="$CANDIDATE_TAG"
docker compose up -d backend frontend
# Wait for the promoted API/worker before routing all requests to it.
for i in $(seq 1 40); do
 if docker compose exec -T gateway wget -qO- http://backend:8080/actuator/health | grep -q '"status":"UP"'; then break; fi
 [ "$i" != 40 ] || exit 1
 sleep 3
done
route 100 1
sed -i 's/server candidate:8080 weight=1;/server candidate:8080 down;/' nginx/default.conf
docker compose exec -T gateway nginx -s reload
printf '%s' "$STABLE_TAG" > .stable-tag
docker compose stop candidate
trap - ERR
echo 'Promoted tested release; API and Kafka workers now use the new version.'
