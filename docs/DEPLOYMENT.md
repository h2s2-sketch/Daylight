# VPS deployment

Daylight is currently deployed from `claude/brave-maxwell-66aq36`. The known repository path is `/var/www/lumi`, and the Node server normally listens on port 3001.

## Before updating

1. Confirm the current branch and working tree.
2. Create a database backup.
3. Do not overwrite `server/.env` or anything under `data/`.

```bash
cd /var/www/lumi
git status -sb
git branch --show-current
npm run backup
```

## Pull, build, and restart

```bash
cd /var/www/lumi
git pull
npm install
npm run build
sudo systemctl restart lumi
```

`lumi.service` is the service name used during the current deployment work, but it is not committed in this repository. **To be confirmed on VPS:** service unit name, unit file path, Linux user, and environment-file configuration.

## Verify the app

```bash
sudo systemctl status lumi --no-pager
sudo journalctl -u lumi -n 100 --no-pager
curl http://127.0.0.1:3001/api/health
```

The health response should be `{"ok":true}`. Then test the public HTTPS site in a private browser window.

## Current Caddy setup

The VPS is known to use a Docker Caddy container that also serves RSSHub. Daylight is reverse-proxied to the host's port 3001.

**To be confirmed on VPS:**

- Caddy container name
- Docker network and host gateway address
- Caddyfile path
- production domain
- exact authentication layer currently active

Useful checks:

```bash
docker ps
docker logs caddy --tail 100
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
```

Do not start nginx on ports 80 or 443 while Caddy owns those ports.

## Rollback

If a deployment fails, keep the database untouched, inspect the logs, and return the code to a previously verified commit. Rebuild the frontend and restart the service. Do not use destructive Git commands when the working tree contains unknown changes.

See `DATABASE.md` for backup details and `TROUBLESHOOTING.md` for common failures.
