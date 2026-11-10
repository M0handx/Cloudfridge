#!/bin/bash
# Backend launch template user data. Paste this whole file into the launch template.
# Before pasting, set RELEASES_BUCKET and check NODE_PACKAGE (see the Phase 3 walkthrough).
set -euo pipefail   # no -x, so secrets stay out of the startup log

RELEASES_BUCKET="cloudfridge-releases-CHANGE_ME"
NODE_PACKAGE="nodejs22"   # confirm with: dnf list 'nodejs*'

export AWS_DEFAULT_REGION=eu-west-1

dnf install -y "$NODE_PACKAGE" unzip

# The versioned package may install only node-22. systemd starts /usr/bin/node.
command -v node >/dev/null || ln -sf "$(ls /usr/bin/node-[0-9]* | head -n 1)" /usr/bin/node

mkdir -p /opt/cloudfridge && cd /opt/cloudfridge
aws s3 cp "s3://$RELEASES_BUCKET/backend/current.zip" .
unzip -o current.zip

get_param() {
  aws ssm get-parameter --name "$1" --with-decryption \
    --query Parameter.Value --output text
}

# Assigned first, so a failed lookup stops the script
DATABASE_URL=$(get_param /cloudfridge/db/app-url)
JWT_SECRET=$(get_param /cloudfridge/jwt-secret)

umask 077
{
  echo "DATABASE_URL=$DATABASE_URL"
  echo "JWT_SECRET=$JWT_SECRET"
  echo "AWS_REGION=$AWS_DEFAULT_REGION"
  echo "NODE_ENV=production"   # turns on verified database TLS
  echo "PORT=3000"
} > /etc/cloudfridge.env

cp deploy/cloudfridge-api.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cloudfridge-api

