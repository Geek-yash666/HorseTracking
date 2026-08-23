# The Turnout Planner — Product Memo

*One page, for Gal. Not part of the app — this is where the Setup/Board scope
stopped and the product thinking starts.*

## Who this is for

Boarding and training barns in the **20–75 horse range**. Below that, a
whiteboard and a group text still basically work — the pain isn't sharp
enough to pay for software. Above that, you've usually got multiple staff
covering shifts, horses moving between paddocks all day, and a barn manager
who is the one person accountable when something goes wrong — that's the
person who feels a missed turnout or a compatibility mix-up as *their*
mistake, and that's who buys.

Start there. Once billing, multi-tenant, and the client portal exist, move
up-market to larger boarding operations and multi-location trainers — but
land on the barn manager whose morning this app is actually trying to save.

## What I'd build next, in order

1. **Multi-tenant + auth.** Right now this is intentionally one barn, no
   login — that was the right scope for a demo, but it's also the reason
   nobody can use this today except the barn whose data is in it. This has
   to come first because nothing else matters until a second barn can sign up.
2. **Billing.** Can't charge anyone without it. Comes right after multi-tenant
   since they're the same unlock: turning a single-barn tool into a business.
3. **A client-facing portal for horse owners.** This is the actual wedge, not
   an afterthought. Boarders currently find out how their horse's day went by
   texting the barn manager — that's a real, constant interruption for barn
   staff, and a real anxiety point for owners. Let owners see today's board
   for *their* horse (status, notes, a photo) and the barn manager stops
   being a human API for "is Biscuit okay." This is also the feature that
   sells itself barn-to-barn: owners board at more than one facility, and a
   good client experience travels with them.
4. **The Steward assistant.** The biggest adoption barrier for a tool like
   this isn't the board, it's onboarding — nobody wants to hand-type every
   horse, paddock, and group into a form before they get any value. An
   assistant that can take a photo of the whiteboard, a voice note, or "move
   Comet to the south ring tomorrow AM" as a chat command turns setup from a
   weekend project into five minutes. This is what actually gets a skeptical,
   busy barn manager to switch off paper.
5. **Horse identity portability.** Real pain — a horse's care history
   scatters every time it changes barns or trainers — but it's a moat
   feature for later, not a reason anyone signs up on day one.

## Positioning

*The barn OS built by people who've actually done evening turnout in the
rain* — not a generic scheduling app with horses bolted on, and not a thin
single-purpose tool that dies the moment the barn wants more than turnout.
Compete against the whiteboard first (that's the real incumbent), and against
point-solution barn software second, on the strength of actually expanding
into a full operating system for the barn rather than staying a scheduling
widget.

## Pricing

Per-barn subscription, tiered by horse count — the same shape Mindbody and
Toast use for per-location vertical SaaS, and it matches how a barn manager
already thinks about their own operation's size:

| Tier | Horses | Price |
|---|---|---|
| Starter | up to 25 | $79/mo |
| Standard | 26–75 | $149/mo |
| Pro | 76+ or multi-location | $299/mo, or custom |

Once the client portal ships, boarder seats become a small add-on (~$2–3 per
boarder/month) — expansion revenue that scales with the barn's own client
base rather than requiring a new sales conversation. Early "founding barn"
pricing (a locked-in discount for the first cohort) is worth considering to
get real barns and real feedback fast, given this is a new entrant into a
market that already has incumbents.
