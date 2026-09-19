# From a logged flag to an offer to check him

Spec for review before the UI is built. Principle: offer a lookup only when
a flag is something a lookup can answer, and say which part of the report
answers it. Nothing here promises safety, uses fear, or manufactures urgency.

## 1. Trigger rules (lib/triggers.ts, server-side, after each save)

Evaluated per man, per date entry, over the union of that date's before,
during and after flags. The highest tier wins. Evaluation is idempotent: the
same date with the same flags never produces a second offer.

| Tier | Fires when | Never fires on | Path |
|---|---|---|---|
| SAFETY | `sig:unsafe` at any stage | | Full-screen safety sheet. Exempt from every limit. Never a paywall. |
| STRONG | any strong signal: `story_mismatch`, `no_last_name`, `money`, `off_app_fast`, `no_footprint` | | Bottom sheet naming the signal and the report section |
| STACKED | 2+ weak signals on the same date (`dodges`, `too_fast`, `ex_talk`, `feels_off`), or 3+ red flags of any kind on the same date (her own red flags and red signals combined; `unsafe` not counted) | | Bottom sheet naming the count and the report sections |
| none | one weak signal alone (`ex_talk` alone never fires); her personal red flags alone, however many below three; any green flag | | Nothing |

Precedence: SAFETY over STRONG over STACKED. A date that would fire both
STRONG and STACKED shows the STRONG sheet, which names one concrete signal.

## 2. Which report section answers which signal

The signal library names abstract sections. The report page has these
sections; the sheet links to the one that answers the signal.

| Signal | Sheet line (after "You tagged: ...") | Report section |
|---|---|---|
| story_mismatch | A report shows every address linked to him, with dates. | 03 Addresses, 03b Other properties |
| no_last_name | A report shows the names and employers tied to his number. | 02 Identity signals, 05 Professional |
| money | A report shows bankruptcies, liens and judgments on record, and his work history. | 06 Public record flags, 05 Professional |
| off_app_fast | A report shows whether his number is a real carrier line or a throwaway, and who it belongs to. | 01 Phone intelligence, 02 Identity signals |
| no_footprint | A report shows who his number belongs to and where else he appears. | 02 Identity signals, 01 Phone intelligence, 07 Social footprint |
| STACKED (weak x2) | A report shows the public record: who his number belongs to, where he has lived, and what is on file. | 01, 02, 03, 06 |
| STACKED (red x3) | same as above | same |

## 3. Offer by plan

| Her state | Primary button | Secondary | Notes |
|---|---|---|---|
| Member with credits (monthly, annual, founding, or single with the report unused) | Check him now (uses 1 of your N this month) | Not now | A nudge. No price on the sheet. For a single-report holder: "Check him now (uses your report)". |
| Member, no credits left | Check him now, $19 for one report | Not now | Single report. Membership is not mentioned; she already has one. |
| Free | Check him now, $19 for one report | "Or become a member: 10 checks a month." links to /checkout?plan=monthly | Annual is never shown here. |
| Free, first purchase, not yet ID-verified, trigger in Before | as above, with the line "Takes about 3 minutes the first time: we confirm your ID once, then never again." | | |
| Free, first purchase, not yet ID-verified, trigger in During | as above, plus a third button "Remind me after the date" | | Reminder lands next morning at 9am her time, through the reminder system (new reminder kind, see gaps). |
| Any, phone not on file | The sheet asks for his number before checkout: "His number, so the report is about the right man." | | Number is saved to his file (encrypted) and pre-fills the lookup. |

## 4. Frequency limits (database, not the browser)

| Limit | Enforced by | SAFETY |
|---|---|---|
| One sheet per man per date entry | `upsell_offers` row keyed (user_id, file_id, date_number); insert-or-nothing | exempt |
| Three sheets per user per 7 days | count of `upsell_events` with outcome `shown` and tier in (strong, stacked) in the last 7 days | exempt |
| "Don't suggest this for him" | `his_files.no_offers boolean` (member-editable, not encrypted: it is a preference, not content) | exempt |
| Sheet dismissed | recorded; the same date never re-fires (limit 1), other dates can | exempt |

## 5. Measurement: upsell_events

    user_id     text        the member (needed for the 7-day count and deletion on account delete)
    tier        text        safety | strong | stacked
    stage       text        before | during | after
    plan        text        her plan at the time, or 'free'
    outcome     text        shown | dismissed | suppressed | checkout_started | purchased | reminded
    created_at  timestamptz

Not stored: which flag fired, the man, the file, the date number. RLS on;
no grants to `authenticated`; written with the service role from the save
route and the checkout route; read only by us. Deleted with the account.

`upsell_offers` (the once-per-man-per-date lock) carries user_id, file_id,
date_number, created_at and nothing about the flag. It is a lock, not a log.

## 6. Sheet copy

### SAFETY sheet (full screen, calm, no prices, no report copy above the fold)

    Eyebrow:   Right now
    Title:     Getting out comes first.

    [ Call 911 ]                       tel:911, largest button, top

    Share where I am with a friend     native share sheet; text: "I'm at
                                       <her typed location or 'a date'>. Here's
                                       my location: <maps link>". If location is
                                       refused, the text goes without the link.

    An excuse to leave, tap to copy:
      "My sister just called, something's happened at home. I have to go."
      "My friend locked herself out and I've got her spare key. I'm so sorry."
      "I've got an early start and I'm not feeling well. Let's call it here."

    Close                              returns to his file

    Only below all of the above, and only when the date is not marked as
    today (During stage suppresses it entirely):

    Check who he is when you're safe.  quiet text link to the normal lookup
                                       flow, no price, no urgency

### STRONG sheet (bottom sheet, dismissible)

    Eyebrow:   You tagged
    Title:     <signal label>                 e.g. His story doesn't add up
    Line:      <sheet line from section 2>    e.g. A report shows every address
                                              linked to him, with dates.
    [ Primary button by plan ]
    Secondary line by plan
    Plan/ID note when it applies
    Not now                                    dismiss
    Don't suggest this for him                 permanent for this man

### STACKED sheet (bottom sheet, dismissible)

    Eyebrow:   You tagged
    Title:     Two signals on one date         or: Three red flags on one date
    Line:      <the tagged labels, joined>     e.g. Avoids direct questions.
                                               Too intense, too fast.
    Line:      A report shows the public record: who his number belongs to,
               where he has lived, and what is on file.
    buttons as STRONG

### Phone ask (inside the sheet, before checkout, when his number is not on file)

    Label:     His number, so the report is about the right man.
    Input:     (415) 555 0100
    Helper:    Saved to his file, encrypted like the rest.
    [ Continue ]

### Reminder confirmation (During, free, unverified)

    Title:     We'll remind you tomorrow morning.
    Line:      The report will still be here. So will your notes.

### After a $19 purchase (credit toward membership)

    Title:     Your $19 counts toward a membership for the next 7 days.
    Line:      Become a member by <date> and the first month is $20.
    [ Become a member ]     /checkout?plan=monthly, credit applied
    Not now

    NOTE: this offer does not exist in the code today. See gaps.

## 7. Copy rules, applied

- No sheet says or implies the report can tell her he is safe. The verb is
  always "shows": a report shows records.
- The sheet names the flag she tagged and what the report shows, then stops.
  No adjectives about him.
- No timers, no "N women checked him", no "limited", no "before it's too late".
- The safety sheet carries no price and no report copy above the exit tools.

## 8. Gaps found in the code, to decide before building

1. There is no existing offer to credit a $19 report toward a membership
   within 7 days. Nothing in checkout, webhooks or the pricing copy does
   this. Building it means: a `single_purchased_at` timestamp on the
   profile set by the webhook, a Stripe coupon of $19 off the first month
   applied at checkout when the timestamp is within 7 days, and the copy
   above. Decide whether to build it here or drop that line.
2. The example "He said he lives in Santa Monica" needs what he said. The
   journal does not hold it: her During note is free text and there is no
   "what he told you" field. The sheet copy above uses the signal label
   instead. If you want his claim in the sentence, the story_mismatch chip
   needs a one-line "What did he say?" input, stored in the date entry.
3. The reminder system is keyed by report_id and sends the 30-day email.
   "Remind me after the date" is a new reminder kind: a row with no report,
   due the next morning, with its own short email. Small, and it fits the
   same table and cron.
4. The 7-day window for the credit offer and the 7-day upsell cap are
   unrelated numbers that happen to match; they are enforced separately.
