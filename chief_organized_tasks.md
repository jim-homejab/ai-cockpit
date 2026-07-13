# Tasks

_Consolidated and deduplicated from the four source files on 2026-07-13. Priorities use Chief's P0–P4 scale._

## Personal organization

- [ ] **Import and approve the consolidated backlog in Chief**
  - _Status: in_progress · Priority: P0 · Impact: high · Effort: s_
  - Upload `chief_organized_projects.md` and `chief_organized_tasks.md` together, review the proposal cards, and approve the clean baseline.

- [ ] **Connect Front to Chief and inventory all open conversations**
  - _Priority: P0 · Impact: high · Effort: s_
  - Start with the Subscribed and Jim open folders after the project/task baseline is approved.

- [ ] **Triage Front to inbox zero**
  - _Priority: P0 · Impact: high · Effort: l_
  - For each conversation: reply/do now, convert to a project/task, delegate, wait with a follow-up, archive, or unsubscribe.

- [ ] **Choose tasks to delegate to gmind or additional help**
  - _Priority: P1 · Impact: high · Effort: s_
  - Prepare a short delegation list to share with Joe.

---

## HomeJab leads & marketing analytics

- [ ] **Reply in HJ-3347 with the confirmed lead-system direction**
  - _Priority: P0 · Impact: high · Effort: s_
  - Confirm all site visits are stored, progression is visit → form fill → order, Pipe0 handles enrichment, Ontraport is out, and campaigns use web app + SMS/Twilio.
  - Ask for status tracking, the lead-to-order join key, and an API/export.

- [ ] **Get an explicit commitment to the lead-to-order join key**
  - _Status: blocked · Priority: P1 · Impact: high · Effort: s_
  - Require lead id and/or email to carry through to the order and be exposed by API/export.
  - Waiting on Vanya/Ivan's HJ-3347 response.

- [ ] **Connect gmind lead/status data to the marketing dashboard**
  - _Priority: P1 · Impact: high · Effort: l_
  - Consume the HomeJab app's lead system of record; do not build duplicate lead capture.

- [ ] **Add auditable lead-to-order revenue reporting**
  - _Priority: P1 · Impact: high · Effort: l_
  - Join ad spend → leads → orders → revenue and report CAC, ROAS, channel, and campaign performance.

- [ ] **Analyze single-package versus dual-package revenue impact**
  - _Priority: P4 · Impact: medium · Effort: m_
  - Validate Jimmy's estimate that moving 30k standard orders to a blended package could add about $1M even with 20% customer loss; include Joe and Kim's concerns.

---

## HomeJab growth marketing

- [ ] **Choose and launch the next landing-page experiment**
  - _Priority: P1 · Impact: high · Effort: m_
  - Evaluate $199+ pricing transparency, the new lander, a $25 account-credit offer, brand-campaign lander, Hotjar findings, and app.homejab.com versus homejab.com.

- [ ] **Define and launch the order-form A/B test**
  - _Priority: P1 · Impact: high · Effort: m_
  - Coordinate with Ivan in HJ-3121. Prioritize mobile scroll reduction and clearer price placement.

- [ ] **Create the next Meta ad set for Premier/new features**
  - _Status: in_progress · Priority: P1 · Impact: high · Effort: m_
  - Lead with convenience, reliability, technology, and valuable add-ons. Use the Premier article and new reel assets without disparaging local photographers.

- [ ] **Optimize Pmax assets and structure**
  - _Priority: P2 · Impact: medium · Effort: m_
  - Review copy and videos and test whether one asset group performs better.

- [ ] **Improve the HomeJab homepage**
  - _Priority: P2 · Impact: medium · Effort: m_
  - Prioritize how it works, proof points, availability check, pricing summary, about, blog, and a strong launch video. Keep “become a photographer” as a footer link.

- [ ] **Test a dedicated YouTube campaign**
  - _Priority: P3 · Impact: medium · Effort: m_
  - Pmax showed little YouTube spend but promising results.

- [ ] **Test a restaurant-focused landing page and Meta campaign**
  - _Priority: P3 · Impact: medium · Effort: m_

- [ ] **Post consistently on LinkedIn for enterprise demand**
  - _Priority: P3 · Impact: medium · Effort: m_

- [ ] **Set up PR opportunity alerts**
  - _Priority: P3 · Impact: medium · Effort: s_
  - Start with SourceBottle and JournoFinder; consider Qwoted Pro only after measuring useful volume.
  - Front source: `cnv_1lv26hpa`.

- [ ] **Audit and consolidate HomeJab marketing-site improvements**
  - _Priority: P3 · Impact: medium · Effort: m_
  - Review virtual staging, neighborhood photography, company/in-the-news, thank-you messaging, reviews, drone pricing, page speed/Astro islands, intro video, ad inspiration, and portfolio support.

- [ ] **Build a competitor comparison table for the lander**
  - _Priority: P4 · Impact: low · Effort: s_
  - Compare HomeJab with Zillow and identify automation gaps and build-versus-buy options.

---

## HomeJab product

- [ ] **Troubleshoot the pricing API issue affecting Manish and Jimmy**
  - _Priority: P0 · Impact: high · Effort: m_
  - Use the linked Slack channel and direct thread from the source list.

- [ ] **Test the new HomeJab mobile app**
  - _Priority: P1 · Impact: high · Effort: m_

- [ ] **Reply to Alex in Jira about user-to-organization mapping**
  - _Priority: P1 · Impact: high · Effort: s_

- [ ] **Prototype or review a targeted app.homejab.com improvement with Cursor**
  - _Priority: P4 · Impact: medium · Effort: m_
  - Use the monorepo for a bounded feature prototype, bug hunt, or code review that can be handed to gmind.

---

## HomeJab AI assistant

- [ ] **Define and build the smallest internal AI assistant prototype**
  - _Priority: P0 · Impact: high · Effort: m_
  - Start with logged-in employees asking questions over the Account Management Google Sheet.

- [ ] **Add the public chatbot to the HomeJab marketing site**
  - _Status: waiting · Priority: P2 · Impact: medium · Effort: m_
  - Waiting on Alex.

- [ ] **Define the HomeJab AI knowledge architecture**
  - _Priority: P2 · Impact: high · Effort: m_
  - Decide how HomeJab MCP, company knowledge, account knowledge, team-member data, Jimmy's brain files, Ontraport/Scribe/Loom, and communication history should be represented.

- [ ] **Decide how HomeJab AI should integrate with Front**
  - _Priority: P3 · Impact: medium · Effort: m_
  - Evaluate draft replies with full context, tagging HomeJab AI into the communication log, embedding it in Front, and capturing tagged Front items into the knowledge base.

---

## HomeJab AI media tools

- [ ] **Complete stage 1 of the highlight reel builder**
  - _Priority: P0 · Impact: high · Effort: l_
  - Upload photos, generate clips with one universal prompt, concatenate, and download a result end to end before adding smarter prompts or polish.

- [ ] **Get current Perfect Edit quality feedback from Vanessa and gmind**
  - _Priority: P1 · Impact: high · Effort: s_
  - Editors are still reporting problems; collect concrete examples and agree on the next fix.

- [ ] **Reassess the Fotello replacement**
  - _Priority: P4 · Impact: medium · Effort: m_
  - Joe found the dev version far from acceptable. Decide whether to change approach or wait for better models.

- [ ] **Explore additional Premier media automation**
  - _Priority: P4 · Impact: medium · Effort: m_
  - Consider virtual tours, flyers/postcards/social tiles, Remotion reels, and virtual-staging margin.

- [ ] **Plan later highlight-reel stages**
  - _Priority: P4 · Impact: medium · Effort: m_
  - After stage 1 works: smart room prompts, sequencing/transitions/speed, music/branding/text, vertical and horizontal formats, then an authenticated API.

---

## HousePro growth marketing

- [ ] **Finish the kitchen landing page and launch the Google Ads campaign**
  - _Priority: P0 · Impact: high · Effort: m_
  - Use Cabinet Tree for walkthrough/design reference; validate the intended bathroom and kitchen budget split before launch.

- [ ] **Launch or verify the bathroom landing-page A/B test**
  - _Status: in_progress · Priority: P1 · Impact: high · Effort: s_
  - Keep monitoring Google Ads after launch.

- [ ] **Audit the marketing report for clarity and accuracy**
  - _Priority: P1 · Impact: high · Effort: m_
  - The Marketing Explorer report must explain performance and be independently auditable.

- [ ] **Review material-delay emails with Maureen**
  - _Priority: P1 · Impact: medium · Effort: s_

- [ ] **Create continuously updated remarketing audiences**
  - _Priority: P2 · Impact: medium · Effort: m_
  - Make the contact audience usable in both Meta and Google Ads.

---

## HousePro CRM & lead operations

- [ ] **Verify and automate direct call/text capture into the CRM**
  - _Priority: P1 · Impact: high · Effort: m_
  - Confirm whether the Front Aircall inbox feeds app.housepro.com. If not, add a Front → Zapier CRM path or route the number through CallRail.

- [ ] **Add missed-call SMS drip and voicemail transcripts**
  - _Priority: P1 · Impact: high · Effort: m_
  - Calls without voicemail enter SMS drip; calls with voicemail show the transcript in the CRM.

- [ ] **Clarify the estimates-page “date” and “created date” fields**
  - _Priority: P2 · Impact: medium · Effort: s_

- [ ] **Fix walkthrough scheduling after lead-to-opportunity conversion**
  - _Priority: P2 · Impact: medium · Effort: s_

- [x] **Fix the leads → walkthroughs → estimates → jobs data flow**
  - _Status: done_

---

## HousePro website & locations

- [ ] **Replace team imagery and use Brian's real photo**
  - _Priority: P2 · Impact: medium · Effort: s_
  - Remove the current team photos and make the requested Phillies-image update.

- [ ] **Plan HousePro location pages and local contact channels**
  - _Priority: P3 · Impact: medium · Effort: m_
  - Start with South Jersey and Central Jersey; evaluate a local number and unique email for each.
