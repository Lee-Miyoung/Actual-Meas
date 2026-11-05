# Private AI editing gateway

GitHub Pages cannot run this server. Deploy it on a separate HTTPS host with a persistent disk and TLS reverse proxy. Only the static app is deployed by Pages. No provider key is placed in the app, Git repository or backup JSON. A ChatGPT subscription does not supply API authentication or API credits.

Python 3.12+ standard library only. Set secret values in your server host's secure settings, not in Git or chat:

- `STUDIO_ACCESS_TOKEN`: private operator access token, at least 32 random characters. Enter this in the app's non-persisted password field. This is a single operator gateway, not a multi-user account system; replace with OIDC for team access.
- `STUDIO_IMAGE_API_KEY`: OpenAI API project key with image-edit permissions and funded billing. Uses `POST https://api.openai.com/v1/images/edits`, model `gpt-image-1`, low quality. Real requests have not been exercised in this environment.
- `STUDIO_ORIGIN`: `https://lee-miyoung.github.io` (CORS origin contains no path).
- `STUDIO_USAGE_DB`: path on persistent private storage. Default `/tmp/...` is for development only; ephemeral disk resets budgets.
- `STUDIO_DAILY_LIMIT`: default 5 attempts per UTC day, including failed/provider-ambiguous requests.
- `STUDIO_MONTHLY_BUDGET_USD`: default 10, a reservation budget, not a measurement of actual provider invoices.
- `STUDIO_RESERVATION_USD`: default 0.50 per attempt; configure conservatively from current model pricing and your image sizes. Actual provider costs vary. Configure provider project spending controls and alerts too; this estimate alone cannot guarantee a billing cap.
- `PORT`: default 8787, listens on loopback. Put a TLS ingress/reverse proxy in front; do not expose a plain HTTP server or operator token over the Internet.

Start from the server directory with `python server.py`. Enter the HTTPS host in the app's settings and check connection. The edit button stays disabled until an authenticated health check confirms an API key is configured. Each edit also requires fresh explicit photo-transmission consent and a nonempty mask. Cloud providers' processing/retention policies apply to transmitted photos.

The gateway rejects foreign origins, missing authentication, missing consent, oversized payloads, non-PNG input, mismatched mask dimensions, concurrent requests and exhausted quotas. TLS verification and inherited proxies are retained. SQLite uses atomic budget reservations. Only request ID, time, reservation and status are retained; photos and token values are not logged. Failed requests retain reservations to reduce duplicate-charge risk.

The app composites the AI result only inside the selected mask, preserving every pixel outside it. Inside the mask wood grain is still inferred; the operator must compare and approve. An original is retained, and edits can be restored. This does not guarantee exact reconstruction of hidden grain.

Validation: `python -m unittest discover -s marketing/tests -v` from repository root. These tests mock the provider and verify gateway contracts; they do not establish actual model quality, provider billing or successful deployment. Required remaining work: choose hosting, provide credentials securely, validate real edits with representative installation photos, and validate mobile browsers against the deployed server.
