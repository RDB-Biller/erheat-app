# ER HEAT app

Third front end of the HNN platform (the others are the Biller and TrimesterSave). Emergency micro-loans for energy, rent, health, education, food and travel, confirmed by the people who know the need and paid straight to them.

**This app holds no lending rules.** Catalogue, limits, verification, fraud checks, consent, lender hand-off and the Trust Passport all live in the HNN Biller (`/erheat/api`, branch `erheat-shield`). The app signs people in with the Biller's patient accounts, so one phone number works across TrimesterSave and ER HEAT.

## Run
```
npm install
ERHEAT_BILLER_URL=http://localhost:4000 npm run dev   # dev server on :5173
npm run build && npm start                            # what Railway runs
```
`ERHEAT_BILLER_URL` is read at build time (default `https://nextgenhnnbiller-production-bdf1.up.railway.app`).

## Deploy on Railway
1. New service from this repo. Build and start come from `railway.json`.
2. Set `ERHEAT_BILLER_URL` on the service, then generate a domain (or attach your own).
3. On the Biller service, add the app's origin to `WIDGET_ORIGINS` if you use the invite widget, and enable ERHEAT in Master Control (`PUT /api/platform/erheat/config {"enabled":true}`).

## Screens
Home (six lines) · sign in / create account · phone confirmation · apply wizard · requests · request detail (heat strip, voucher, consent) · Trust Passport · account.
