# OpenTrade site

The marketing-and-play shell for OpenTrade, rebuilt as a sportsbook
rather than a dashboard: poster type, ledger rows, a paper betting slip
for your wallet and quests, an LED tape that carries the compliance
line, and Gary the husky running a live higher-or-lower book on the
homepage. The floor tab opens the walkable 3D casino in floor/.

The source of truth for the 3D floor is ~/CASINO; sync it here with:

    rsync -a --delete --exclude .git ~/CASINO/ ./floor/

Run locally:

    python3 -m http.server 8000

then open http://localhost:8000. All market numbers are synthetic;
no money, no prizes, product preview, not investment advice.
