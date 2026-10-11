# SOLVENT T

I built this dashboard to put the SOLVENT T crude blending and supply plan in one place. You can try different blends, check cargo quality, plan deliveries, and keep the test records needed for plant clearance.

[Try the dashboard](https://solvent-t.vercel.app)

## What you can do

- Adjust Heavy, Super-heavy, and Light crude shares and compare the predicted salt after desalting.
- Check daily crude demand, usable light inventory, buffer coverage, and any stock shortfall.
- Add cargo passports with assay results and agreed contract and plant limits.
- Track primary deliveries and backup suppliers, including confirmed volumes and arrival slots.
- Record fresh and aged sample tests and plant approval against the selected blend.
- Save scenarios in your browser and export them to CSV.

The charts update as you change the inputs. Each chart also has a table if you need the exact values.

## Run it locally

You'll need Node.js. The chart dependencies are already bundled, so there's no install step.

```sh
git clone https://github.com/becky283/solvent-t-dashboard.git
cd solvent-t-dashboard
npm run dev
```

Open [localhost:4173](http://localhost:4173).

To check the code and calculations:

```sh
npm run check
npm test
```

## How the checks work

The starting blend is 50% Heavy, 40% Super-heavy, and 10% Light at 300,000 bbl/day. Desalter efficiency starts at an assumed 97%, with a five-day light buffer. These are reference inputs you can change.

Inlet salt and BS&W are weighted by each crude's volume share. Predicted outlet salt is inlet salt multiplied by the fraction left after desalting. The light inventory target is daily light demand multiplied by buffer days.

Salt screening requires a result below 2 PTB. Fresh and aged sample checks also require measured outlet salt below 2 PTB, outlet BS&W below 0.05%, compatibility tests, and TAN and Ni + V within the unit limits you enter. The internal 1.5 PTB salt target is advisory.

Cargo passports compare measured assays with the recorded contract and plant maxima. Missing evidence stays pending. Primary supply only counts when it matches a passport used in the blend and its volume and arrival slot are confirmed within the planning window. Backups count after you promote them to primary.

Changing the blend, cargo, or process inputs clears the sample tests and approval. Changes to deliveries, limits, or test records clear approval so it can be reviewed again.

Inputs, tests, and approvals are entered manually. Scenarios stay in the browser where you saved them. Export before switching browsers or hosting addresses. The CSV includes the blend summary and the full cargo, delivery, and clearance records.

## Deploy

Import the repo into Vercel with these settings:

- Framework: **Other**
- Build command: leave empty
- Output directory: **dist**

The included `vercel.json` already has these settings. The app is static HTML, CSS, and JavaScript, with React and Recharts bundled for the charts.

## Contributions

Feel free to open an issue or send a pull request. If you change the calculation rules, include the reasoning and a test for the result.

## License

The project code is available under the [MIT license](LICENSE). Bundled dependencies keep their own licenses in [THIRD_PARTY_NOTICES.txt](dist/THIRD_PARTY_NOTICES.txt). The ZEKINDO name and logo are outside the code license.
