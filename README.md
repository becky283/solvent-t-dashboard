# SOLVENT T — ZEKINDO

A local, interactive workspace for crude selection, blending, salt screening, and supply planning. The interface uses English, a pale blue workspace, simple white panels, and a collapsible navigation sidebar.

## Run locally

Requires Node.js. No packages need to be installed.

```powershell
npm run dev
```

Open http://localhost:4173/. The development server listens on the local machine only.

```powershell
npm run check
npm test
```

## Deploy to Vercel

Import this directory as a project, select **Other** as the framework, leave the build command empty, and use **dist** as the output directory. The included `vercel.json` contains these settings. No environment variables or backend are required.

## Dashboard features

- Edit H / SH / L volume shares, crude suppliers, salt, BS&W, processing capacity, and desalter efficiency.
- Compare baseline, reduced super-heavy, and cleaner super-heavy scenarios.
- Calculate daily demand, light inventory target, coverage, and additional inventory from the selected blend.
- Record compatibility, outlet BS&W, TAN, and metals verification separately from salt screening.
- Save named scenarios in browser storage and export the active, reference, and saved scenarios as an English CSV.
- Keep shipment, backup supplier, and inventory age notes with each scenario.

Inputs are labelled **Reference**, **Assumption**, or **Test result**. Edited numeric inputs become assumptions. Existing saved scenarios from the earlier interface retain their data and receive updated standard labels when loaded. User-entered names and notes are preserved.

## Interactive charts

The dashboard includes seven chart panels:

1. **Desalter sensitivity:** calculated outlet salt across a range of desalter efficiencies, with the current setting and the 2 PTB threshold marked.
2. **Inlet contribution:** volume-weighted salt or BS&W contribution from each crude type.
3. **Blend composition:** Heavy / Super-heavy / Light shares of total volume.
4. **Scenario comparison:** predicted outlet salt for the selected inputs and the three reference scenarios.
5. **Light buffer requirement:** cumulative light demand over the chosen buffer period, with usable inventory as an optional reference line.
6. **Daily crude demand:** daily supply volume for each crude type.
7. **Buffer coverage:** usable light inventory as a percentage of the target.

Charts update with the inputs and expose exact values in expandable tables. Cartesian charts support keyboard tooltips. Sensitivity and buffer series are calculated scenarios; they are not historical measurements. Buffer projection assumes constant demand and excludes future deliveries. Missing inventory remains unknown; zero inventory is a valid entered value. A coverage ring fills at 100%, while its displayed percentage can exceed 100%.

React and Recharts are included in the local `charts-runtime.js` bundle. The app makes no CDN requests and needs no package installation. Third-party notices are included with the distribution.
## Calculation basis

The baseline follows the SOLVENT T dashboard brief:

| Parameter | Heavy | Super-heavy | Light |
| --- | ---: | ---: | ---: |
| Volume share | 50% | 40% | 10% |
| Salt, PTB | 42 | 115 | 8.5 |
| BS&W | 1.2% | 3.8% | 0.15% |

Capacity is 300,000 bbl/day. Assumed desalter efficiency is 97%; the light buffer is 5 days. Actual usable inventory starts blank.

- Inlet salt = sum(volume fraction × cargo salt).
- Inlet BS&W = sum(volume fraction × cargo BS&W).
- Predicted outlet salt = inlet salt × (1 − efficiency fraction).
- Daily crude demand = capacity × volume fraction.
- Light inventory target = daily light demand × buffer days.
- Coverage = usable light inventory / daily light demand, if demand is positive and inventory is entered.
- Additional light inventory = max(0, target − usable inventory), once inventory is entered.

Salt screening requires predicted outlet salt **strictly below 2 PTB**. Separate verification requires compatibility, outlet BS&W **strictly below 0.05%**, and TAN and metals within the unit's confirmed limits. Changing blend composition, cargo quality, or process assumptions clears the verification record. Rounding affects display only.

This prototype uses manual input and browser storage. It has no live inventory connection or authentication. Saved scenarios belong to the browser and origin where they were created; export them before changing browsers or hosting locations.

## Source files

- `dist/index.html`: interface and dialogs.
- `dist/styles.css`: blue visual system and responsive layout.
- `dist/model.js`: calculations, validation, and reference scenarios.
- `dist/app.js`: input handling, scenario storage, verification, and CSV export.
- `dist/charts.js`: interactive React/Recharts chart components.
- `dist/charts-runtime.js`: bundled chart dependencies.
- `dist/THIRD_PARTY_NOTICES.txt`: bundled dependency licenses.
- `server.cjs`: local static server.
- `verify.cjs`: formula and boundary checks.
- `vercel.json`: static deployment settings.

