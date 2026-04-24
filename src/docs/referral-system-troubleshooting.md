# Referral System Troubleshooting

## I Can't Find My Referral Link

**Symptom:** Link not visible in dashboard or missing after page reload.

**Solution:**
1. Log in → Navigate to **ReferralDashboard**
2. Scroll to the top section labeled "Your Referral Code"
3. Your code appears as `PK-XXXXXX` (example: `PK-A1B2C3`)
4. Full link: `https://app.pipekeeper.com/?ref=PK-XXXXXX`
5. Click **Copy Link** to clipboard or **Share** button to send

**If still missing:**
- Refresh the page (Cmd+R / Ctrl+R)
- Clear browser cache and reload
- Log out and back in
- Try a different browser
- [Contact support](#contact-support)

---

## My Reward Isn't Showing Up

**Symptom:** A friend subscribed using my link, but no reward appears in the dashboard.

**Check 1: Verify the Subscription**
- Confirm your friend actually completed signup AND subscribed (not just trial)
- Ask them: "Did you convert your trial to a paid plan?"
- Trials alone don't trigger rewards

**Check 2: Wait for Processing**
- Rewards process within 24–48 hours
- System runs fraud checks (automatic, happens in real-time)
- If still missing after 2 days, proceed to Check 3

**Check 3: Verify Your Link Was Used**
- Ask your friend: "Did you click my referral link before signing up?"
- Check your dashboard: **Recipient Clicks** count increasing?
  - If clicks are there but no reward: likely still processing
  - If no clicks: they used a different link/method

**Check 4: Fraud Flag**
- Rewards for suspicious signups are held pending manual review
- Check your email for a message from support
- Common flags:
  - Signup from same IP/device as your account
  - Rapid sequential signups
  - Mismatched email domain or device info
- **Solution:** Reply to support email with context (household member, gift, etc.)

**Check 5: Already Referred**
- If your friend previously had an account and subscription, they can't be referred again
- Referrals only work for brand-new signups

**If still unresolved:**
- [Contact support](#contact-support) with:
  - Your email
  - Friend's email
  - Signup date they provided
  - Referral link you sent

---

## Reward Status: "Pending" or "Ready to Apply" Not Changing

**Symptom:** Reward shows as "pending" or "ready to apply" but never transitions to "applied" or "redeemed."

**For Stripe Users:**
- Rewards should auto-apply within 24 hours
- If stuck, check:
  1. You have an active Stripe subscription
  2. Your billing info is current in your Stripe portal
  3. Refresh your dashboard (Cmd+R / Ctrl+R)
  4. Wait another 24 hours (system may be processing)
- **If still stuck:** [Contact support](#contact-support)

**For iOS Users:**
- Reward shows "ready to apply"? You must manually **Redeem** it
  1. Open dashboard
  2. Find the reward card
  3. Click **Redeem** button
  4. Select a module (PipeKeeper, WhiskeyKeeper, CigarKeeper, WineKeeper)
  5. Confirm selection
  6. Access activates within seconds
- If **Redeem** button is missing or grayed out, [contact support](#contact-support)

**For Free Users:**
- Same process as iOS: click **Redeem** and select a module
- If button is missing, you may need an active referral reward
- [Contact support](#contact-support) if you earned a reward but can't redeem it

---

## Redemption Failed or Error Appeared

**Symptom:** Clicked "Redeem" but got an error or nothing happened.

**Common Errors:**

| Error Message | Cause | Fix |
|---|---|---|
| "Reward not found" | System lost track of reward (rare) | Refresh page; [contact support](#contact-support) |
| "Module selection required" | You didn't pick a module | Click dropdown, select PipeKeeper/WhiskeyKeeper/CigarKeeper/WineKeeper, try again |
| "Access already active" | Module already has active access | Wait for current access to expire, then redeem another reward |
| "Transaction failed" (iOS) | StoreKit error or network issue | Try again in a few minutes; check internet connection |
| "Unauthorized" | You're not logged in | Log in and retry |

**Steps to Resolve:**
1. Refresh dashboard (Cmd+R / Ctrl+R)
2. Log out → Log back in
3. Try redeeming on a different device or browser
4. Check your internet connection
5. If error persists, [contact support](#contact-support) with the exact error message

---

## Friend's Subscription Isn't Being Counted

**Symptom:** Friend says they subscribed using your link, but it's not showing as a qualified referral.

**Verify These Details:**

1. **Did they use YOUR link?**
   - Ask: "Did you click the link I sent you?"
   - Check if they used a different code or arrived via discount page
   - Referrals only count if your link/code was used at signup

2. **Did they complete payment?**
   - Ask: "Did your subscription go through without errors?"
   - Trial → Payment issue → Subscription cancelled = not qualified
   - They must have an active, paid subscription

3. **Is their account in good standing?**
   - Ask: "Is your account still active?"
   - Cancelled subscriptions may delay reward processing
   - Wait 48 hours after their subscription activates

4. **Are they a new user?**
   - Referrals only work for brand-new signups
   - If they're an existing user with a previous account, referral doesn't count
   - Ask: "Is this your first time signing up?"

5. **Location or fraud concerns?**
   - Different country than you? May trigger additional checks (normal)
   - Same household/IP? May hold pending manual review (expected)
   - Wait 2–3 business days for review

**If all checks pass:**
- Wait 24–48 hours (processing time)
- If still missing, [contact support](#contact-support) with both emails + signup date

---

## My Referral Code Changed or Disappeared

**Symptom:** Your referral code is different than before, or you can't find your old code.

**What Happened:**
- Referral codes are permanent and should never change
- If you see a new code, you may be looking at a different account
- Clear cache: some browsers cache old dashboard data

**What to Do:**
1. Verify you're logged into the correct account
2. Clear browser cache and cookies
3. Log out → Log back in
4. Navigate to ReferralDashboard again
5. Your code should be the same as before

**If code truly changed:**
- This is rare and indicates a system issue
- [Contact support](#contact-support) immediately with:
  - Your email
  - Old code (if you remember)
  - Current code shown in dashboard

---

## I Want to Revoke or Disable My Referral Link

**Symptom:** You want to stop sharing or disable your link entirely.

**Current Limitations:**
- Referral links can't be revoked or disabled
- Your code is permanent and tied to your account
- You can't delete or regenerate it

**Workarounds:**
- Simply stop sharing the link (don't distribute it further)
- It remains in your account but won't be used if you don't share it
- If you want to remove it permanently, [contact support](#contact-support) to discuss account changes

---

## Email Invite Isn't Being Delivered

**Symptom:** You sent an email invite, but your friend says they didn't receive it.

**Check 1: Verify the Email Address**
- Confirm the email is spelled correctly
- Ask your friend: "What's your current email?" (it may have changed)
- Typos = invite goes to wrong person

**Check 2: Check Spam Folder**
- Ask your friend to check their spam/junk folder
- Our emails are legitimate but may be filtered
- Ask them to "mark as not spam"

**Check 3: Email Delivery**
- System sends invites instantly
- If it shows "sent" on your dashboard, we delivered it
- Email providers may delay or filter (not our control)

**Check 4: Resend**
- Go back to "Send Email Invite" form
- Re-enter email address
- Click send again (system allows re-sends)

**Check 5: Try a Different Method**
- Share your link directly via text/messenger instead
- Send the full link: `https://app.pipekeeper.com/?ref=PK-XXXXXX`
- Skip the email system

---

## I Redeemed a Reward But Don't See Module Access

**Symptom:** Clicked "Redeem," confirmed module selection, but module still shows as locked.

**Check 1: Verify Redemption Completed**
- Refresh dashboard (Cmd+R / Ctrl+R)
- Navigate to the module (e.g., PipeKeeper)
- Check if access is now unlocked

**Check 2: Check Reward Status**
- Look at the reward card
- Status should show "active" or "redeemed"
- If still "pending," refresh or wait a few minutes

**Check 3: Browser Cache**
- Clear browser cache (Cmd+Shift+Delete / Ctrl+Shift+Delete)
- Close and reopen the app
- Try a different browser

**Check 4: Module Not Displaying**
- Some modules may be hidden if your app variant doesn't support them
- Log out → Log back in
- Check your account settings for module visibility

**If access still locked:**
- [Contact support](#contact-support) with:
  - Your email
  - Module you selected
  - Redemption date/time
  - Screenshot of error (if any)

---

## I Have a Refund or Cancellation Question

**Symptom:** Subscribed via referral link, paid by mistake, or want to cancel.

**Referral Rewards (Free Access):**
- Can't be "refunded" (they're free and non-monetary)
- If unused, they don't expire—you can redeem later
- Contact support to discuss if needed

**Paid Subscriptions via Referral:**
- Referral link doesn't change your subscription type
- You have the same refund/cancellation rights as any subscriber
- Contact support or visit your Stripe/Apple portal to request cancellation

**Billing Issues:**
- Stripe: Manage via Stripe customer portal (account settings → billing)
- iOS: Manage via Apple App Store (Settings → Subscriptions)
- Support can walk you through either

---

## Contact Support

If your issue isn't resolved above:

**Email:** support@pipekeeper.com

**In-App:** Help Center → Contact Support

**Provide:**
- Your email address
- Detailed description of issue
- Relevant timestamps or dates
- Screenshots (if applicable)
- Any error messages

**Response Time:** 24–48 business hours

---

## Quick Reference

| Issue | Try This First |
|---|---|
| Can't see link | Refresh dashboard; clear cache |
| Reward not showing | Wait 24–48 hours; check spam folder if email invite sent |
| Redemption failed | Log out/in; try different browser; check internet |
| Friend's sub not counted | Verify they used your link and completed payment |
| Module still locked | Refresh page; clear cache; try different browser |
| Dispute with friend | Contact support with both emails + signup date |