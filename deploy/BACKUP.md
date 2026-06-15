# Daylight scheduled backups

The Settings page can export portable JSON data, restore that data, and create an immediate SQLite backup. The files in this directory add a daily VPS backup with systemd.

## Install the timer

Run from the repository root on the VPS:

```bash
sudo cp deploy/daylight-backup.service deploy/daylight-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now daylight-backup.timer
```

The included service expects the repository at `/var/www/lumi` and keeps the newest 14 backups. Confirm that path before installing.

## Check and run backups

```bash
systemctl list-timers daylight-backup.timer
sudo systemctl status daylight-backup.timer --no-pager
sudo systemctl start daylight-backup.service
sudo journalctl -u daylight-backup.service -n 50 --no-pager
ls -lh /var/www/lumi/data/backups
```

`Persistent=true` means a missed scheduled run starts after the VPS is available again.

## Restore warning

Do not overwrite a live SQLite database while Daylight is running. Stop the app, preserve the current database, restore a verified backup, check ownership, then start the app and test `/api/health`.

See `../docs/DATABASE.md` for data handling and `../docs/DEPLOYMENT.md` for VPS operations.

