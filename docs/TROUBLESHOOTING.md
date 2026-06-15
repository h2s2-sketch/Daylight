# Troubleshooting

## The page has no styling

Confirm the build produced CSS and that the HTML references the same file:

```bash
ls -lh client/dist/assets
grep stylesheet client/dist/index.html
```

Then force-refresh the browser. If an installed PWA or browser still uses an old asset, unregister the service worker or clear site data and reopen the site.

## `Internal server error`

Check the Node service log first:

```bash
sudo journalctl -u lumi -n 100 --no-pager
```

For sidebar images, use PNG, JPEG, or WebP. The browser optimizes large photos before upload; the server limit is 8 MB.

## Port 3001 is unavailable

```bash
sudo ss -ltnp | grep 3001
curl http://127.0.0.1:3001/api/health
```

If no process is listening, inspect and restart the Daylight systemd service.

## Caddy returns 502 or cannot connect

Confirm Node is healthy on port 3001, then inspect Caddy:

```bash
docker logs caddy --tail 100
docker exec caddy caddy validate --config /etc/caddy/Caddyfile
```

The Caddy container must be able to reach the host's port 3001. Confirm the Docker network gateway and firewall rule on the VPS.

## 401 Unauthorized

A 401 response means login protection is working but the request has no valid session. Sign in through the browser. For command-line testing, use the authentication method configured on the VPS. Do not place passwords in shell history or documentation.

## Frontend build fails

```bash
cd /var/www/lumi
npm install
npm run build
```

Read the first build error, including its file and line number. Do not rely only on the final npm lifecycle message.

## Login fails after deployment

Confirm `AUTH_USERNAME`, `AUTH_PASSWORD`, and `SESSION_SECRET` are all set together. For HTTPS production, set `NODE_ENV=production` so the session cookie is secure. Never print the secret values when diagnosing the configuration.

## Backups are missing

```bash
systemctl list-timers daylight-backup.timer
sudo systemctl status daylight-backup.timer --no-pager
sudo journalctl -u daylight-backup.service -n 50 --no-pager
ls -lh /var/www/lumi/data/backups
```

Confirm the repository path in the systemd service matches the real VPS path.

