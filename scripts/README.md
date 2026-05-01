# scripts

Operational scripts for the CSAT deployment.

## reset-data.sh

Wipe all client data and re-seed. Use this before handing off the deployment
to a new client.

```bash
scripts/reset-data.sh           # interactive
scripts/reset-data.sh --yes     # skip confirmation
```

What it deletes:
- SQLite database (control statuses, evidence, custom users, audit logs,
  comments, settings, AI chat history)
- Uploaded files (evidence + company logo)

What survives (recreated by the seed on next start):
- The 18 CIS Controls v8 + safeguards
- Default users `admin@csat.local` / `analyst@csat.local`
- Role definitions

## backup.sh / restore.sh

Snapshot and restore the data + uploads volumes. Tarballs go into `backups/`.

```bash
scripts/backup.sh
# → backups/csat-backup-20260501T143000Z.tar.gz

scripts/restore.sh backups/csat-backup-20260501T143000Z.tar.gz
```

Run `backup.sh` before `reset-data.sh` if you want to keep the current state.
