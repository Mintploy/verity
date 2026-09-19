# Runbook: encrypting existing His File data

For running on a Mac, in Terminal, one command per line. Written 2026-09-19.

Two migrations, run in this order, each verified on your own account first:

1. **Journal and report data** (`journal:encrypt`): notes, dates, icks, gifts, report_data.
2. **Identity** (`identity:encrypt`): full_name, nickname, phone, plus the HMAC dedupe keys. Only after 1 is verified.

Both scripts refuse to run unless the local `VERITY_MASTER_KEY` opens every data key production has already written, and both take a restore-point copy of `his_files` before changing a row.

## 0. Before you start

- The code must be in production first (see "How code reaches production" at the bottom). The scripts write ciphertext that only the new code can read.
- Sign in to the production site and save or edit any His File entry once. That creates your data key under the deployed master key, which is what the scripts check the local key against. Without it they refuse to run.

## 1. Get the branch and install

Open Terminal. If you already have the repo cloned, skip the first two lines and `cd` into it.

```
cd ~/Desktop
git clone https://github.com/Mintploy/verity.git
cd verity
git fetch origin
git checkout claude/fervent-dijkstra-xfn6sv
git pull origin claude/fervent-dijkstra-xfn6sv
npm ci
```

`npm ci` installs exactly what `package-lock.json` pins, including `tsx` 4.23.13. It does not fetch anything unpinned.

## 2. Create `.env.local`

`.env*` is in `.gitignore` (line 34), so this file is never committed. Create it in the `verity` folder:

```
nano .env.local
```

Paste these five lines, each value copied exactly from the Vercel project settings (Settings, Environment Variables, Production), with no quotes and no trailing spaces:

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
VERITY_MASTER_KEY=
LOOKUP_HASH_SECRET=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`LOOKUP_HASH_SECRET` and the anon key are only needed by the identity script, but set all five now. Press Control-O, Return, then Control-X to save and exit nano.

Load them into the shell for this Terminal window:

```
set -a; source .env.local; set +a
```

If you open a new Terminal window later, run that line again.

## 3. Journal migration, your account only

```
npm run journal:encrypt -- --dry-run --user kaori.tempel@gmail.com
```

What you should see:

```
master key check: opens all 1 existing data key(s), matches production
[dry-run] kaori.tempel@gmail.com <row id>: would change notes, dates, ...
dry-run: N rows changed, M unchanged, 0 data keys created, 1 members
```

If instead it prints `REFUSED: VERITY_MASTER_KEY does not open ...`, the value in `.env.local` is not the one in Vercel. Fix it and run again. If it prints `REFUSED: no data key exists yet`, do step 0.

Now apply to your account:

```
npm run journal:encrypt -- --apply --user kaori.tempel@gmail.com
```

What you should see:

```
master key check: opens all 1 existing data key(s), matches production
restore point: public.his_files_snapshot_20260919_143000  (drop it after verifying)
apply: N rows changed, M unchanged, 0 data keys created, 1 members
```

Write down the snapshot table name.

## 4. Check in the browser

On the production site, signed in as yourself:

- Open His File. Every entry should list as before.
- Open one entry. Notes, dates, icks and gifts should read exactly as you left them. Edit a note, save, reload: it should persist.
- On an entry with "View report", open it. The full report should render.
- Open Compare. The men you saved should still appear with their scores.
- Run Wrapped for this year. The counts and "Top ick" should be unchanged.

If anything is blank or errors, run the rollback for your account and tell me:

```
npm run journal:encrypt -- --rollback --user kaori.tempel@gmail.com
```

## 5. Journal migration, everyone

```
npm run journal:encrypt -- --dry-run
npm run journal:encrypt -- --apply
```

## 6. Drop the snapshot tables

Each snapshot holds plaintext copies. In the Supabase dashboard, SQL Editor, run one line per snapshot, using the names the script printed:

```
drop table public.his_files_snapshot_20260919_143000;
```

To list any you have forgotten:

```
select tablename from pg_tables where schemaname = 'public' and tablename like 'his_files_snapshot_%';
```

## 7. Identity migration (only after step 4 is verified)

Same pattern, four phases:

```
npm run identity:encrypt -- --dry-run --user kaori.tempel@gmail.com
npm run identity:encrypt -- --backfill --user kaori.tempel@gmail.com
```

Check His File in the browser: the list, one entry, and that saving the same man from a report again lands on the existing entry rather than creating a second.

```
npm run identity:encrypt -- --backfill
npm run identity:encrypt -- --encrypt --user kaori.tempel@gmail.com
```

Check the browser again: names and phones must display as before.

```
npm run identity:encrypt -- --encrypt
```

The last line printed must read `rows with a phone and no phone_hmac (must be 0 before dropping phone_normalized): 0`.

Then, in Vercel, add `HISFILE_IDENTITY_ENCRYPTION` with the value `on` to Production and redeploy, so new saves are sealed too. Then tell me, and I will apply `supabase/his_files_drop_phone_normalized.sql`, which is guarded and refuses if anything is still plaintext.

Drop the snapshot tables as in step 6.

## How code reaches production

Vercel builds every push to this branch as a **preview** deployment (URL `verity-git-claude-fervent-dijkstra-xfn6sv-verity-s-projects1.vercel.app`, behind Vercel SSO). **Production** (verityprive.com) is the deployment marked `target: production`. Two ways to get a commit there:

- **Merge to master.** Open a pull request from `claude/fervent-dijkstra-xfn6sv` into `master` on GitHub and merge it. Vercel builds `master` as production automatically.
- **Promote a preview.** In the Vercel dashboard, Deployments, find the preview for the commit, open its menu and choose "Promote to Production". This is how commit 3ae5958 reached production.

Either way, check the Deployments list afterwards: the top entry with `Production` next to it should show the commit you intended.
