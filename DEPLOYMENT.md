# Deployment Guide

This project is ready for a public preview deployment, but the current review-record storage is file-based and should be replaced before a production launch that needs durable admin data.

## Recommended Launch Path

Use this order:

1. Rotate the Qwen API key because the current key was shared in chat.
2. Deploy the Next.js app to Vercel for a public preview URL.
3. Configure production environment variables in Vercel.
4. Replace local file storage with a hosted database before relying on the review backend in production.
5. Add a custom domain after the preview behaves correctly.

## Why Database Comes Before Real Production

The app currently stores review records in:

```text
data/question-records.json
```

That works for local demos and internal testing. It is not durable on serverless hosting. Vercel Functions have a read-only filesystem with only temporary `/tmp` writable storage, so review records should be moved to Supabase, MySQL, Postgres, or another hosted database before real users depend on the admin backend.

## Environment Variables

Configure these in Vercel Project Settings:

```bash
QWEN_API_KEY=replace_with_a_new_rotated_key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
QWEN_VISION_MODEL=qwen-vl-plus
NEXT_PUBLIC_SITE_URL=https://your-domain.example
ADMIN_USERS=admin:replace_with_strong_password:admin,reviewer:replace_with_strong_password:reviewer
```

Optional legacy fallback variables:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_with_strong_password
```

Do not copy `.env.local` into Git or paste secrets into public issue trackers, docs, or chat tools.

## Vercel Deployment Steps

1. Push this repository to GitHub.
2. Open Vercel and choose `Add New Project`.
3. Import the GitHub repository.
4. Keep the framework preset as `Next.js`.
5. Add the environment variables listed above for `Production`.
6. Deploy.
7. After Vercel gives you a URL, update `NEXT_PUBLIC_SITE_URL` to that URL or to your custom domain.
8. Redeploy after updating environment variables.

## Preflight Commands

Run these locally before each deploy:

```bash
npm run lint
npm run build
```

## Post-Deploy Checks

Open the deployed URL and verify:

- The homepage loads.
- Text-only question answering works.
- Image upload question answering works.
- `/admin` redirects to `/admin/login` when logged out.
- Admin login works with `ADMIN_USERS`.
- `/api/review` returns `401` while logged out.
- Review records should only be considered durable after a hosted database is connected.

## Database Options

Recommended easiest option:

- Supabase Postgres

Other options:

- Vercel Postgres or Neon Postgres
- PlanetScale or other MySQL-compatible services
- Alibaba Cloud RDS

Once you choose the database provider and give me the connection string, I can replace `lib/question-records.ts` with a real database-backed implementation.
