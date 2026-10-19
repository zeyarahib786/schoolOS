# Operations drills

Run from the repository root:

```bash
npm --prefix server run build
SCHOOLOS_DB_TOOLS_DIR=/private/path/database-tools/bin npm --prefix server run test:backup
node tests-e2e/operations/rollback.cjs
node tests-e2e/operations/release.cjs
node tests-e2e/operations/preflight.cjs
SCHOOLOS_NGINX_PATH=/private/path/nginx node tests-e2e/operations/nginx.cjs
```

Use official MongoDB Database Tools and a local MongoDB test replica set. The backup drill creates fictional BSON records, an immutable PDF and a real GridFS upload; encrypts an archive; restores into a separate database; verifies document hashes/indexes; and rejects wrong keys, corruption, populated targets and unsafe target names. All data and decrypted files are temporary and cleaned up. This is an isolated drill, not a backup of the live school database.

The static rollback drill verifies release integrity, an atomic symlink switch, retention of previous hashed assets, HTML/CSS rollback and refusal of tampered releases. AWS S3/CloudFront and API image rollback need verification on the actual hosting target. See [deployment and operations](../../docs/setup/deployment.md).

Native Nginx checks wrap the actual checked-in server configuration with temporary paths and a fictional API upstream. They verify compressed Arabic runtime bytes, hashed/stable asset caching, inherited security headers, SPA fallback and private same-origin API responses. They do not replace Docker-image validation. Package/preflight checks reject development targets, secrets, corruption and production demo seeding.
