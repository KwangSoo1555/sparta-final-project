#!/bin/bash
cd /var/app/staging
sudo npm install
sudo npm run build
sudo npm run start

# 배포 전 테스트 실행 명령어
# sudo chmod +x .platform/hooks/prebuild/01_start_app.sh