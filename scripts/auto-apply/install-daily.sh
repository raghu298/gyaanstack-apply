#!/bin/zsh
# Makes GyaanStack Apply start on login and runs the auto-apply every day at 08:00.
# Undo: launchctl unload ~/Library/LaunchAgents/com.gyaanstack.apply*.plist && rm ~/Library/LaunchAgents/com.gyaanstack.apply*.plist
set -e
LA=~/Library/LaunchAgents
DATA="${GYAANSTACK_DATA_DIR:-$HOME/gyaanstack-data}"
NODE_BIN="$(dirname "$(command -v node)")"
mkdir -p $LA "$DATA"
cat > $LA/com.gyaanstack.apply.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.gyaanstack.apply</string>
<key>ProgramArguments</key><array><string>/bin/zsh</string><string>-c</string><string>export PATH=$NODE_BIN:/usr/bin:/bin; exec $DATA/start-app.sh</string></array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>$DATA/server.log</string>
<key>StandardErrorPath</key><string>$DATA/server.log</string>
</dict></plist>
EOF
cat > $LA/com.gyaanstack.apply-autoapply.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.gyaanstack.apply-autoapply</string>
<key>ProgramArguments</key><array><string>/bin/zsh</string><string>$DATA/run-auto-apply.sh</string></array>
<key>StartCalendarInterval</key><dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
<key>StandardOutPath</key><string>$DATA/auto-apply.log</string>
<key>StandardErrorPath</key><string>$DATA/auto-apply.log</string>
</dict></plist>
EOF
# Stop a copy started by hand so the login one can take port 3000.
pkill -f ".next/standalone/server.js" || true
for plist in $LA/com.gyaanstack.apply.plist $LA/com.gyaanstack.apply-autoapply.plist; do
  launchctl unload $plist 2>/dev/null || true
  launchctl load $plist
done
echo "Installed: GyaanStack Apply starts on login; auto-apply runs daily at 08:00 (log: $DATA/auto-apply.log)."
