# Draft privacy policy language: lookup logging, IP addresses, and what stays after deletion

For legal review. Plain description of what the system does. Makes no claim about what any law permits or requires.

---

## Proposed new section: How we log lookups

Every time you run a lookup, or try to, we write one record to a lookup log. Each record holds:

- your account email;
- a keyed hash of what you searched (the phone number, name, email or address you entered, or the internal identifier of a person you picked from a list). A keyed hash is a one-way code produced with a secret key we hold. It lets us tell whether two lookups were for the same thing. It does not let us, or anyone who obtains the log, read back what you typed;
- a keyed hash of the record the lookup matched, when it matched one;
- the kind of search (phone, name, email, address, a pick from the list, or a relative from a report);
- the IP address your request came from;
- whether the lookup went ahead and counted against your monthly allowance;
- the result (for example completed, stopped by the daily limit, stopped because the match was under 18);
- the date and time.

We use this log to enforce the daily lookup limit, to notice patterns that may indicate misuse of the service, to investigate reports of misuse, and to see how often our under-18 check had no age to check against. The log is written once and is not edited afterwards. Only Mintploy staff with database access can read it.

## Proposed new section: Account review flags

If your account meets one of a small number of patterns, we record a review flag on it. Some flags pause your ability to run lookups until a person at Mintploy has reviewed the account. Others are recorded for review only and do not affect your use of the service.

The patterns are:

- a lookup that matched a person under 18 (this pauses lookups immediately, and the report is not shown or saved);
- lookups on more than eight different people within seven days (this pauses lookups);
- three or more lookups on the same person within thirty days, where that person does not have a His File with at least one logged date (this is recorded for review only).

A flag records the reason, the date, and a small amount of context such as a count. It does not record who you looked up. When a flag is reviewed and cleared, the record of it is kept with the date it was cleared and a note.

If your account is paused, email verity@mintploy.com. We aim to review within [review time].

## Proposed change to the existing section 8, "Data retention" and section 9, "Do not sell my personal information"

Replace the sentence "You can delete your account and all associated data at any time from Settings → Delete account; deletion is immediate and irreversible" with:

> You can delete your account at any time from Settings → Delete account. Deleting your account immediately and permanently removes your profile, your His Files and any reports saved to them, your Verity Wrapped data, and any search reminders you set. It also destroys the key that encrypts your journal entries.
>
> Two things are kept after you delete your account: the lookup log described in "How we log lookups", and any review flags on the account. They are kept for [retention period] from the date of each record, and are then deleted. We keep them so that a person cannot misuse the service, delete the account, and leave no trace. During that period they are held under the same access restrictions as before and are used only for the purposes described above.

Replace "You can delete all your data instantly at any time through Settings → Delete account" in section 9 with:

> You can delete your account through Settings → Delete account. See "Data retention" for what is removed immediately and what is kept for a limited period.

## Proposed addition to section 2, "Information we collect"

Add after the existing sentence about search inputs:

> We also record the IP address from which each lookup request is made, as part of the lookup log described below.

## Notes for the reviewer

- The retention period and the review time are placeholders. Engineering can enforce any period; see the note on retention in `supabase/lookup_audit_and_flags.sql`.
- The log is keyed by account email. After account deletion the email is still in the log. If the reviewer prefers, the deletion routine can replace it with a keyed hash of the email at deletion time, which keeps pattern matching possible and removes the readable address. That is a small change.
- "Keyed hash" is HMAC-SHA256 with a secret held in our hosting environment, separate from the database.
