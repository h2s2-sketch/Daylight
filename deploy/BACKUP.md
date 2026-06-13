# Daylight backups

The Settings page can download a portable JSON file, restore that file, or create an immediate SQLite backup on the server.

For a daily VPS backup, install the included systemd units:

```bash
sudo cp deploy/daylight-backup.service deploy/daylight-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now daylight-backup.timer
systemctl list-timers daylight-backup.timer
```

Backups are written to `/var/www/lumi/data/backups`. The scheduled job keeps the newest 14 files. `Persistent=true` runs a missed backup after the VPS starts again.
