@echo off
chcp 65001
title [memz-plugin] 重启云崽

set delayTime=%1

echo [memz-plugin] 等待 %delayTime% 秒后开始重启...
for /L %%i in (1,1,%delayTime%) do (
  timeout /t 1 /nobreak > NUL
  echo %%i 秒...
)

echo [memz-plugin] 正在关闭原进程...

echo [memz-plugin] 启动新云崽实例...
start "" node app.js

exit
