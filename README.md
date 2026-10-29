# The Turnout Planner

A barn's daily turnout board — set up horses and turnout spaces, build recurring
turnout groups and schedules, then run the day from a live board that tracks what
went out, when, where, and what changed. A 3D barn map shows where every horse is
right now, and the board itself answers the same question in plain text.

I built this as a take-home for OnStride. No detailed spec was given on purpose —
the brief was basically "a barn does turnout every day, go build the thing" — so a
lot of the shape of this came from just thinking through how I'd actually want to
run a barn's morning and evening turnout off a whiteboard, and what would make that
worse instead of better on a screen.

## Running it locally

```bash
npm install
```

You'll need a Postgres database — I used [Neon](https://neon.tech) since it has a
one-click Vercel integration and a generous free tier. Create a `.env` file in the
project root with:

```
DATABASE_URL="postgresql://..."
```

`postinstall` runs `prisma generate` for you, so once the env var is set:

```bash
npx prisma migrate dev   # applies migrations to your database
npm run seed              # optional — resets to a full demo barn (12 horses, 6 spaces, 5 groups, today's board already in progress)
npm run dev              # http://localhost:3000
```
