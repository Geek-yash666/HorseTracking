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

## Stack, and why

Next.js (App Router) + TypeScript, Tailwind, shadcn/ui, Prisma against Postgres.
Everything — frontend and API — lives in one Next.js app, mostly because Vercel was
the one hard requirement in the brief and this setup avoids standing up and
deploying a second backend service just for this.

A few things worth explaining if you're reading the code:

**Next 16, not 14.** The brief mentioned Next 14, but `create-next-app` gave me 16
by default and I didn't see a reason to fight it — App Router works the same either
way for what I'm doing here. Worth knowing: Next 16 changed enough (Prisma 7's
client generation, some App Router conventions) that I actually had to go read the
docs shipped in `node_modules/next/dist/docs` a couple of times instead of relying
on what I remembered from older versions.

**Prisma 7 needs a driver adapter now** — the generated client no longer reads
`DATABASE_URL` off the schema file directly, it wants an adapter passed in at
construction time. I'm using `@prisma/adapter-pg` (plain `pg` over Neon's normal
Postgres connection string) rather than Neon's HTTP driver, since the app runs on
Vercel's Node runtime, not Edge — a normal TCP connection is simpler and it's one
less dependency. That's all in `src/lib/prisma.ts`.

**Server Actions instead of API routes** for basically everything — creating a
horse, editing a space, turning a horse out, swapping its paddock. Each is a plain
`<form action={...}>` hitting a function in an `actions.ts` file next to the page
that uses it. No client-side fetch/JSON wiring, and the forms still work if JS
hasn't loaded yet. The only spot that needed a small client component is the
space-swap dropdown on Today's Board, so it can submit itself the moment you pick a
new space instead of needing a separate save click.

**Groups store members through a join table** (`GroupHorse`), and I reconcile
membership on save by just deleting and recreating the rows in a transaction rather
than diffing who got added or removed. At the scale of one barn's worth of horses
that's simpler and plenty fast — I'd only bother diffing if this were managing
thousands of rows.

**`TurnoutEvent` has a unique constraint on `(date, horseId, shift)`.** I added
this specifically so "Generate from schedule" on Today's Board is safe to click
more than once in a day — it's a `createMany` with `skipDuplicates`, so re-running
it after someone adds a new horse to a group doesn't blow away anyone's status.

**Today's Board doesn't actually require Schedule Rules to exist.** Clicking
"Generate from schedule" creates an event for every horse in every group whose
rule matches today and has a default space set. But you can also add a horse
straight onto the board by hand — that's how the board stays useful before you've
set up any recurring schedule, and it's how you'd handle a one-off horse that
isn't normally in the rotation.

**Compatibility rules got their own page**, even though the brief's Setup list
didn't mention one — the schema has `CompatibilityRule` and the board is supposed
to flag conflicts, so something has to let you create those rules. I kept it to
one page (list + a small inline add form) instead of a full CRUD flow, since a
rule like "these two kick each other" doesn't really have fields worth editing —
you'd just delete it and add a new one.

**Space capacity is actually enforced, not just stored.** `Space.capacity`
was in the schema from the start but nothing read it until I noticed — a real
barn manager cares immediately if five horses land in a four-horse paddock.
Today's Board now flags that the same way it flags a compatibility conflict,
right next to the space name.

**Playfair Display stands in for Denton, and Inter carries the UI text.**
OnStride's actual typeface isn't available as a web font, so per the brief I used
a close serif instead — Playfair Display via `next/font/google` for headings,
the wordmark, and big stat numbers. A serif everywhere gets hard to read at
small sizes and high densities though, so all body/UI/data text is Inter (also
via `next/font/google`). Both are wired into the theme tokens in
`globals.css`/`layout.tsx`.

**The whole UI went through a proper design pass.** The first version of this app
was functional but looked like a wireframe. It now has a real application shell:
a deep-green branded sidebar (collapsing to a hamburger sheet on mobile) with the
operations views separated from barn setup, a two-font system (above), a shared
status language — one `StatusBadge` component whose colors mean the same thing on
the board, the dashboard, and the map — capacity meters rendered as segmented
slot bars so an over-capacity paddock reads at a glance, horse "avatar" initials
that are color-deterministic per name (Comet looks like Comet everywhere), empty
states with actual guidance, and confirmation dialogs on every destructive action.

**Today's Board is a status-first kanban.** Four live columns answer "where is
everyone" at a glance — Out on pasture (photo cards), Waiting to go out, Back in
the barn / Staying in / Not on the board (stacked), and Conflicts, where flagged
horses get their own pink cards with a Resolve action (reveal a paddock move +
skip without hunting through menus). A controls row adds search, an AM/PM
filter, a Group-by toggle (Status ⇄ Shift), and grid/list density. Below it,
a Shifts & Groups panel summarizes occupancy per space with capacity meters,
and a Recent Activity feed replays the day's completed actions from the event
timestamps. Every mutation still runs through bound Server Actions via each
card's kebab menu — turn out, bring in, skip, undo, move paddock, edit note,
remove.

**There's a realistic dual-mode barn map at `/map`.** This takes the "see where every horse is at a
glance" requirement to the next level:
- **Dual-Mode Visualization**:
  - **3D Realistic Estate Simulation**: An interactive Three.js estate simulation featuring an American heritage timber barn with cupola weathervanes and glowing stable lanterns, dressage arenas with white vinyl perimeter, arena letter markers ($A, K, E, H, C, M, B, F$), show jumps, pipe corral round pens, lush Kentucky bluegrass paddocks, automatic water troughs, John Deere utility tractors, stacked round hay bales, and diverse trees (oaks, birches, pines).
  - **Satellite / GIS Aerial Map Mode**: A high-resolution real-world aerial view of a premier equestrian estate (Wellington, FL / 26°40′44″N 80°14′38″W) with interactive GIS paddock boundary polygons, live horse GPS tracking markers with headshot avatars, live temperature/wind stats, and a ground moisture / mud heatmap toggle.
- **Realistic Horse Procedural Models & Genetics**:
  - Instead of generic plastic cylinders, horses are rendered with anatomical equine geometry: muscled barrel and flank, withers curve, arched crest neck, tapered muzzle with soft nostrils, alert movable ears, articulated legs with knee/hock/cannon joints, dark hooves with white socks, and a flowing multi-segment tail with fluid wave physics.
  - Every horse has distinct, genetically accurate coat profiles and disciplines: Comet (rich bay show jumper), Juniper (dapple grey KWPN dressage mare), Sable (obsidian black senior hunter), Maple (golden flaxen chestnut filly), Marigold (lustrous palomino), Whiskey (buckskin colt), Clover (bay tobiano pinto pony), Rowan (dark bay with vet bandage wrap), and more.
  - Realistic behaviors: horses grazing on grass in pastures, alert idling by the barn, and ear twitches.
- **Dynamic Atmosphere & Weather Simulation**:
  - Switch between Morning Sunrise (7:00 AM gold mist), Crisp Midday (12:00 PM), Sunset Golden Hour (5:30 PM), and Rainy Overcast with animated falling rain streaks and wet ground gloss.
- **Direct Live Barn Operations**:
  - Clicking any horse opens a luxury equestrian inspector card with full breeding/discipline info, live turnout duration, and one-click actions (`Turn Out`, `Bring In`, `Skip`, `Move to Paddock`) that update the database and revalidate both `/map` and `/board` seamlessly.

A few honest engineering notes on the map, since that's where the trade-offs live:

- **Layout is derived, not stored.** Plot positions/sizes are computed
  deterministically from each space's index and type — no x/y coordinates in
  the schema. The same barn always renders the same map; storing real floor
  plans is future work (see "What I'd do next").
- **Status is carried by beacons, not coat color.** Coats are realistic, so
  every horse floats a small colored beacon (green out / blue in / white
  waiting / orange skipped) matching the legend; satellite markers use the
  same stroke colors. Conflict pairs get spinning red rings in both modes.
- **Virtual horses get a safe write path.** Active horses with no event today
  appear resting in the yard as client-side virtual rows; their drawer offers
  "turn out now," which *upserts* a real event on the `(date, horseId, shift)`
  constraint rather than trying to update a row that doesn't exist.
- **three.js loads client-only**, via `next/dynamic` with `ssr: false`, and
  only on `/map`. Satellite mode (plain SVG) doubles as the no-WebGL fallback.


**The Horses page is a proper directory now.** Photo cards (photo left, status
chip, notes, age/gender meta), a stats strip (total / mares / geldings /
stallions with % of total), live search, and a filter rail — status, gender, an
age range slider, group, and sorting. Filtering is instant client-side rather
than behind an "Apply" button because waiting on a round trip to filter 12
horses would be silly; the mockup's Apply button survives only in the mobile
drawer where it closes the panel. The `Horse` model gained `photoUrl`, `breed`,
`gender`, `ageYears`, and a three-state `lifecycle` ("rotation" | "training" |
"retired") that replaces the old boolean `active` — only rotation horses are
scheduled onto the board. Photos: pick from bundled sample images (CC0/public-
domain, in `/public/horses`), paste a URL, or upload a file — uploads get
resized client-side (720px JPEG) and stored as data URLs on the horse's row,
which keeps the project free of blob-storage setup while still letting a real
barn use its own photos.

**The sidebar is now a command center instead of a date stamp**: a mini month
calendar with gold dots on days that have turnouts scheduled (counts come from
a small `/api/calendar` endpoint) — click any day to open that day's board at
`/board?date=YYYY-MM-DD`; and a live weather panel powered by Open-Meteo (free,
keyless) with a curated barn-town location picker persisted to localStorage,
current conditions, and an expandable 10-day forecast with rain probabilities.
The board accepts the `?date=` param everywhere "today" used to be hardcoded —
generation, manual adds, and the header all respect the viewed day.

**Every page is force-dynamic** (`export const dynamic = "force-dynamic"` in
the root `layout.tsx`, inherited by every route). Found out why the hard way:
I wrote `prisma/seed.ts` to reset the barn to a fuller demo dataset, ran it
directly against the database, and the live site kept showing the old
2-horse data — Next had statically prerendered these pages at build time
since nothing about a plain Prisma call looks "dynamic" to it, and only my
own `revalidatePath()` calls inside the Server Actions had ever told it to
regenerate them. A page that reads live barn state should never be able to
go stale just because a change didn't come through the UI, so every route
is now rendered fresh on every request instead of relying on remembering to
invalidate the right paths.

**`prisma/seed.ts`** resets the barn to a realistic demo state — a dozen
horses with actual personalities and restrictions, six spaces, five groups,
their schedule rules, a few compatibility conflicts, and today's board
already mid-morning with a mix of in/out/skipped/scheduled horses. Run with
`npm run seed` (needs `tsx`, added as a dev dependency). It's destructive —
clears existing turnout data first — which is the right behavior for a demo
reset script, not something I'd want on a real barn's data.

**Known rough edge:** there's a harmless console warning from shadcn's `Input`
component (something about "changing the default value of an uncontrolled
FieldControl") whenever a note field's value updates after a save. Doesn't affect
what's saved or what's displayed — looks like a shadcn/Base UI thing rather than
anything in my code, so I didn't go patch a generated component just to silence a
dev-console warning.

## What I'd do next

- Date navigation on Today's Board — right now it's always "today" using the
  server's UTC date, which is fine for a demo but wrong the moment a barn's local
  time crosses midnight in a different direction than UTC. There's no user/barn
  profile yet to hang a timezone off of.
- A friendlier error than a raw foreign-key failure if you try to delete a horse
  or space that's already referenced by a `TurnoutEvent` (the confirm dialog now
  warns before you click, but the failure mode if you proceed is still generic).
- Storing an optional floor-plan position per space so the barn map reflects how
  the physical property is actually laid out, instead of deriving the layout.
- Using `ScheduleRule.durationMin` to show an "expected in by" time on a
  horse that's currently out. I looked at this alongside the capacity fix,
  but `TurnoutEvent` doesn't track which rule generated it, and a horse can
  belong to more than one group — so "which duration applies" isn't
  well-defined without either a schema change (store the duration, or a rule
  reference, on the event itself) or picking an arbitrary tie-break. Rather
  than guess at that modeling decision, I left duration visible on the
  Schedule page and didn't wire it into the board.

Deliberately **not** building, even though it's obviously where this product goes
next: multi-barn/multi-tenant support, moving a horse's history between barns,
Stripe billing, a real login system, or the natural-language "Steward" assistant
idea. All of that belongs in the product memo, not in a take-home. Scope judgment
was explicitly something I was told this gets graded on, and "smaller and
finished" beats "bigger and half-working."

## Product memo

[PRODUCT_MEMO.md](./PRODUCT_MEMO.md) — one page on who this is for, what I'd
build next, positioning, and pricing, if OnStride took this to market. Not
part of the app; it's the separate deliverable the brief asked for.

## Deploying

Live at https://turnout-planner-pavan-prudhvi.vercel.app

Deployed straight from the CLI (`vercel --prod`) against my own Vercel account
rather than through the GitHub integration — the repo lives under OnStride's
GitHub org, and Vercel's free tier doesn't support connecting to a private
repo owned by an organization you're not an admin on. `DATABASE_URL` points
at the same Neon project I use locally, so whatever's in the database —
including the seed data — is what's live, with no separate deploy step to
sync it.
