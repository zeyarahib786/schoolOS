# Setup guide

For the exact local setup commands, use [LOCAL_SETUP.md](LOCAL_SETUP.md).

The standard full-stack command is:

```bash
docker compose up -d --build
docker compose --profile seed run --rm seed
```

Then open http://localhost:8080.
