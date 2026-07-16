# OTLP Log viewer

A small app to display OTLP logs.

## Requirements

Three main requirements:

1. Log List View — Display logs in a table (Severity, Time, Body) with expandable rows showing all attributes (`2fb284d`, `cc56e3d`, `d8f0103`)
2. Histogram — Visualize log distribution over time (X: Time, Y: Count) (`9b69661`, `eb022fb`)
3. Group by Service — Add a toggle that switches between flat list view and grouped view (organized by parent resource with collapsible groups) (`0a85307`)

Additional functionality implemented:

4. Allow selection of services via pulldown menu (`b05b8e2`, `c520d8a`, `16f2451`)
5. Color coding of severity and service (`925ea3c`, `ccd8b12`, `15e4edb`)
6. Allow histogram to display severity level and log volume (`eb022fb`, `ccd8b12`)
7. Allow click and drag on histogram to allow user to slice and dice (`ccd8b12`)
8. Allow reordering of columns by using drag and drop (`06569b0`, `16f2451`)
9. Store column settings (which columns selected + column order) in local storage (`1147142`)
10. Reflect column settings in URL so its sharable (`d805ee6`)
11. Allow color coding of services (`ccd8b12`, `15e4edb`, `1539268`)
12. Allow user to select service in drawer, selecting that service (`15e4edb`)
13. Allow filtering by severity (`c520d8a`, `15e4edb`)
14. Allow filter and keyboard commands for service / column / severity pulldown menus (`16f2451`, `1539268`)
15. Pagination on table (`cc56e3d`)
16. Add refresh button (`15e4edb`)
17. Show and format all available log attributes in drill down drawer (`d8f0103`)
18. Generate TS types from OTLP protobuf (`e18b191`, `925ea3c`, `6f489c2`, `b1f2e33`, `d34abb7`)
19. Add unit tests for transformation functions (`944a84c`)
20. Deploy on Vercel (deployed via the Vercel dashboard/CLI — not a commit)
