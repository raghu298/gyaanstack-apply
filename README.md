# GyaanStack Apply

A self-hosted job-application copilot: one profile, a tailored resume and cover letter for each job, and a daily run that finds Senior GenAI roles and applies by email with your own resume.

Version 1.1.0. Part of [GyaanStack](https://gyaanstack.com): [GenAI learning library](https://gyaanstack.com) · [Articles](https://blog.gyaanstack.com) · [Videos](https://videos.gyaanstack.com) · [Website](https://apply.gyaanstack.com)

[![Download for Windows or Linux](https://img.shields.io/badge/Download-Windows%20%7C%20Linux-0b7a6b?style=for-the-badge)](https://github.com/raghu298/gyaanstack-apply/releases/latest)
[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-aigyaanstack-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/aigyaanstack)
[![Website](https://img.shields.io/badge/Website-apply.gyaanstack.com-0a192f?style=for-the-badge)](https://apply.gyaanstack.com)

<a href="https://buymeacoffee.com/aigyaanstack"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" height="50"></a>

## What it does

GyaanStack Apply runs on your own computer or server, with one password and your data in your own PostgreSQL database (or an SQLite file). You pick the AI model: a local one through Ollama or LM Studio, or a hosted one (Anthropic, Mistral or any OpenAI-compatible API).

- **Profile.** Your experience, projects, skills, education and certifications in one place. You can start it by importing an existing resume (PDF, Word or Markdown).
- **Resumes.** A base resume with twelve themes and a theme builder, printed to PDF on the server.
- **Tailored applications.** Paste a job posting and it pulls out the requirements, shows how your profile matches, and writes a resume and cover letter for that job. It only uses facts from your profile. A requirement you don't meet shows up as a gap; it is never made up.
- **Refine in a chat.** Ask for changes, edit any part by hand, undo AI edits or go back to an earlier version.
- **Find jobs.** Search JSearch (LinkedIn, Indeed and more), Adzuna and FreeHire from one screen, plus hiring startups from YC and Hacker News. A job agent can run saved searches once a day, score new postings against your profile and prepare drafts for you to review.
- **Gmail and Calendar (optional).** Send an application from your own address with the PDFs attached, see employer replies next to each application, and keep interviews in step with Google Calendar. Nothing is sent without your confirmation in the app.
- **Track.** A board and a table of every application from draft to offer, and a dashboard with your funnel and upcoming interviews.
- **Claude connector (optional).** An MCP server, so Claude can search jobs, read your profile and save drafts. It never sends or deletes anything.
- **Phones and laptops.** Every screen works on a phone: a top bar with a slide-out menu, a board you swipe one column at a time, and stacked editors.
- **Your data.** Export and import everything as one file, plus nightly backups.

## What GyaanStack Apply adds

GyaanStack's own additions:

- **Your own resume file on email applications.** Set `GYAANSTACK_RESUME_PDF`, and optionally `GYAANSTACK_RESUME_JAVA_PDF`, and emails attach that file instead of the tailored PDFs. Postings that are mostly about Java get the Java resume.
- **Gmail rate-limit pacing.** A new Google Cloud project has a low per-minute Gmail quota. A `403 rateLimitExceeded` is now treated as a quota error: message reads are spaced out and retried, instead of the inbox check failing as a permissions problem.
- **Anthropic structured-output fallback.** When Anthropic rejects a large schema ("The compiled grammar is too large"), the schema goes into the system prompt instead. 
- **Daily auto-apply** (`scripts/auto-apply`), started each morning by launchd:
  1. Waits for the 08:00 job agent run, then checks the inbox so recruiter replies link to the right application.
  2. Searches JSearch with a rotating list of 16 Python + GenAI and Java + GenAI phrases (Bengaluru, or remote from India) and FreeHire for postings that give an application email address. Good matches become drafts.
  3. Emails the postings that ask for applications by email, with your own resume attached. Each run has a send cap, never writes to the same company twice, and skips QA, DevOps, intern, trainer and other off-target titles and low-fit matches.
  4. Reads the nightly GyaanStack jobs email, keeps the Bangalore and remote roles you have not applied to, and saves them for a manual apply session.
  5. Mails you a summary of what was sent and what is waiting for you on job portals, and shows a Mac notification.
- **Owner guard.** The script only sends from the Google account in `GYAANSTACK_OWNER_EMAIL`. If a different account is connected, it sends nothing and says so in the summary.

## Quick start

You need Node.js 24, Yarn and PostgreSQL. These steps run the app natively, without Docker.

1. Create a database and a user for it, for example `gyaanstack` / `gyaanstack`.
2. Install the dependencies (this also makes `yarn hash-password` work for the next step):

   ```sh
   yarn install
   ```

3. Copy `.env.example` to `.env` and fill in the required values:
   - `DATABASE_URL`, your PostgreSQL connection string. Edit the existing `DATABASE_URL=` line rather than adding a second one, so the file has only one.
   - `GYAANSTACK_SECRET`, at least 32 random characters (`openssl rand -base64 32`)
   - `GYAANSTACK_PASSWORD`, a hash of your sign-in password, made with `yarn hash-password`. Put it in single quotes, because the hash contains `$` signs.
4. Set up the database and build:

   ```sh
   yarn generate
   npx prisma migrate deploy
   npx prisma db seed
   yarn build
   cp -R .next/static .next/standalone/.next/static
   cp -R public .next/standalone/public
   cp .env .next/standalone/.env
   ```

   `yarn generate` makes both database clients (PostgreSQL and SQLite) the app loads; `npx prisma generate` alone makes only the first, and the seed then fails with "Cannot find module '@/generated/prisma-sqlite/client'".

5. Start it, reachable only from your own computer:

   ```sh
   HOSTNAME=127.0.0.1 PORT=3000 node .next/standalone/server.js
   ```

6. Open http://localhost:3000, sign in, and pick an AI model in **Settings → AI provider**.

Every setting is an environment variable starting with `GYAANSTACK_`; `.env.example` lists them all.

### Daily auto-apply

1. Connect Gmail in **Settings → Google** with your own Google OAuth client.
2. Add these to `.env`:

   | Variable | What it is | Default |
   | --- | --- | --- |
   | `GYAANSTACK_OWNER_EMAIL` | The only Google account applications may go from; the summary goes here too | required |
   | `GYAANSTACK_RESUME_PDF` | Path to your main resume PDF | tailored PDFs |
   | `GYAANSTACK_RESUME_JAVA_PDF` | Path to a resume for Java roles | `GYAANSTACK_RESUME_PDF` |
   | `GYAANSTACK_JSEARCH_KEY` | JSearch (OpenWeb Ninja) API key | searches off |
   | `GYAANSTACK_JSEARCH_PER_DAY` | Search phrases per day; the free plan (about 200 requests a month) fits 4 | 4 |
   | `GYAANSTACK_MAX_NEW_DRAFTS` | New drafts per run | 15 |
   | `GYAANSTACK_MAX_SENDS` | Email applications per run | 8 |
   | `GYAANSTACK_DATA_DIR` | Folder for the scripts, logs and the saved GyaanStack job list. The app keeps its nightly backups here too | `~/gyaanstack-data` (app: `/data`) |

3. Copy the files in `scripts/auto-apply` to that data folder and run `install-daily.sh`. It installs two launchd jobs: one keeps the server running, the other starts the daily run.
4. For a dry run that sends nothing, put `DRY=1` in front of the `tsx` command in `run-auto-apply.sh`.

Keys and addresses stay in `.env`, which git ignores.

## Privacy

Your profile, applications and documents stay in your own database. The text the AI works from (your profile, the posting, emails you ask it to read) goes to the AI provider you choose. With a local model, nothing leaves your machine. The optional Google connection reads replies to your applications, sends the mails you approve and reads your calendar for interview times. See [PRIVACY.md](PRIVACY.md) for the details.

## Roadmap

- Track portal applications (Naukri, LinkedIn, Instahyre) in the app without manual status updates.
- Add more job sources for India.
- A setup guide for running it on a small cloud server instead of a laptop.
- It is single-user today: one password, one profile. Supporting more than one person would need accounts, which it does not have yet.

## Security

How to run it safely and report a problem: [SECURITY.md](SECURITY.md).

## Support

GyaanStack Apply is free. If it saves you hours of rewriting resumes, a coffee pays for hosting and keeps new features coming.

<a href="https://buymeacoffee.com/aigyaanstack"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy me a coffee" height="50"></a>

To learn GenAI and prepare for interviews, see [GyaanStack](https://gyaanstack.com).

## Licence

GNU AGPL-3.0, see [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md). You may use, change and share it. If you run a changed version for other people over a network, you must offer them its source code.
