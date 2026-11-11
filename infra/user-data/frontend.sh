#!/bin/bash
# Frontend launch template user data. Paste this whole file into the launch template.
# Before pasting, set RELEASES_BUCKET (see the Phase 3 walkthrough).
set -euo pipefail

RELEASES_BUCKET="cloudfridge-releases-m1"

export AWS_DEFAULT_REGION=eu-west-1

dnf install -y nginx unzip

cd /tmp
aws s3 cp "s3://$RELEASES_BUCKET/frontend/current.zip" .
rm -rf /usr/share/nginx/html/*
unzip -o current.zip -d /usr/share/nginx/html

cat > /etc/nginx/default.d/spa.conf <<'EOF'
# Without this, reloading a page like /stats returns 404 instead of the React app.
location / {
  try_files $uri /index.html;
}

# Build files have a content hash in their names, so browsers can keep them.
location /assets/ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# index.html is checked on every visit, so a new release shows immediately.
location = /index.html {
  add_header Cache-Control "no-cache";
}
EOF

nginx -t
systemctl enable --now nginx

