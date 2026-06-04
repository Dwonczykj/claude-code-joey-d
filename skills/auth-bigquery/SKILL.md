---
name: auth-bigquery
description: Re-authenticate Google Cloud application-default credentials for BigQuery access
command: auth-bigquery
---

Run the following command to re-authenticate:

```bash
gcloud auth application-default login
```

This opens a browser for Google OAuth. Once complete, BigQuery MCP tools should work again.