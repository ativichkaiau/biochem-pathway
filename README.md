# Biochem Met

Interactive metabolism map with qualitative perturbations, a reaction-linked coenzyme reference, and 40 clinical teaching cases in English and Thai.

## Run locally

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open <http://127.0.0.1:8765>. No build or package installation is needed.

## Study tools

- **Coenzymes**: search 16 coenzyme/cofactor families by name, vitamin, enzyme or Thai term; inspect references, spotlight linked reactions and their endpoints, or jump to a step. Unrelated reactions dim; the view frames the linked network.
- **Electron flow**: open the respiratory model from Coenzymes or a redox highlight. Follow NADH → I (FMN/Fe–S) or succinate → II (bound FAD/Fe–S), then CoQ → III → cytochrome c → IV → oxygen. Gold map tracks show these electron-transfer routes separately from ordinary reaction traffic. Change donor/oxygen supply or toggle the map’s respiratory inhibitors. Pause and restart carrier pools; phone and portrait iPad diagrams arrange vertically.
- **Toolbar**: search, coenzymes, cases and conditions on desktop; primary navigation in the bottom bar on touch screens. The **•••** menu contains Details on touch screens, Help, Focus and Reset.
- **EN / ไทย**: persistent language choice, also available in the introduction and an active case. Switching languages preserves draft answers, questions, scores and progress. Chemical formulae, enzyme identifiers, units and genetic variants retain their standard notation.

## Content and localization

`index.html` owns the map and simulation. `data/coenzymes.js` annotates existing enzyme steps; these annotations do not change simulation values. Some map arrows summarize multiple reactions, which the reference descriptions identify.

The English files in `cases/` own lab values, targets, correct-choice indices and scoring weights. `locales/cases-th.js` supplies parallel Thai narratives, prompts, choices, feedback and offline answer aliases. `locales/th-study.js` covers all metabolite explanations, conditions, pathway summaries, cell descriptions and coenzyme explanations. `locales/th.js` and `locales/th-labs.js` cover interface and lab terminology.

`locales/i18n.js` retains original display text so a language change updates the existing interface without restarting a case. It excludes user-written content and canonical SVG notation. Translation is local; there is no translation-service request. Interview and grading API requests include the selected `language`; the local interview and approximate keyword checker support English and Thai. Mechanism aliases count toward their original rubric group, so multiple synonyms do not earn extra points.

## Validate content

```sh
node scripts/check-study-data.cjs
```

Run `node scripts/check-electron-flow.cjs` for electron conservation, carrier bounds, oxygen/water stoichiometry, substrate depletion, inhibitor bypass/blockade, proton backpressure, uncoupling and red-cell behavior.

Checks JavaScript syntax, locale coverage, case and question shape, canonical targets, Thai answer aliases, and every coenzyme-to-enzyme link. Browser validation also covers responsive layouts, language persistence, unfinished cases, keyboard navigation and fallback grading.

## Reference basis

Each coenzyme entry links to its source. Vitamin/coenzyme summaries use NIH Office of Dietary Supplements fact sheets for [thiamin](https://ods.od.nih.gov/factsheets/Thiamin-HealthProfessional/), [riboflavin](https://ods.od.nih.gov/factsheets/Riboflavin-HealthProfessional/), [niacin](https://ods.od.nih.gov/factsheets/Niacin-HealthProfessional/), [pantothenic acid](https://ods.od.nih.gov/factsheets/PantothenicAcid-HealthProfessional/), [B6](https://ods.od.nih.gov/factsheets/VitaminB6-HealthProfessional/), [biotin](https://ods.od.nih.gov/factsheets/Biotin-HealthProfessional/), [folate](https://ods.od.nih.gov/factsheets/Folate-HealthProfessional/) and [B12](https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/).

Additional references include [human PDH complex architecture](https://pmc.ncbi.nlm.nih.gov/articles/PMC466950/), [NDUFV1/FMN](https://pubchem.ncbi.nlm.nih.gov/gene/4723), [BH4 in Reactome](https://reactome.org/content/detail/R-HSA-1474151), [CoQ](https://www.ncbi.nlm.nih.gov/books/NBK603562/), [PNMT/SAM](https://pubchem.ncbi.nlm.nih.gov/gene/5409), [glutathione reductase](https://www.ncbi.nlm.nih.gov/gene/2936), and [ascorbate in dopamine β-hydroxylation](https://pmc.ncbi.nlm.nih.gov/articles/PMC3449284/).

The upgrade also clarifies the [older-red-cell G6PD question](https://pmc.ncbi.nlm.nih.gov/articles/PMC283614/), removes GDH from the PLP-dependent enzyme list, distinguishes [dichloroacetate activation of PDH](https://pubmed.ncbi.nlm.nih.gov/4478069/) from shared complex inhibition, and distinguishes xanthine-oxidase inhibition from [rasburicase-mediated urate degradation](https://www.cancer.gov/publications/dictionaries/cancer-drug/def/rasburicase). Both legacy `expl` and `explanation` MCQ fields are supported.

## Electron-flow model

`data/electron-flow.js` conserves electron equivalents through finite NADH, QH₂ and reduced cytochrome-c pools. Cytochrome c is a one-electron carrier; NADH and QH₂ carry pairs. Complexes I/III/IV contribute 4/4/2 H⁺ per pair; Complex II does not pump. The Q cycle is summarized. A bounded proton-gradient pool feeds ATP synthase and proton leak, producing backpressure when ATP synthase is inhibited. Donor supply replenishes electrons; oxygen reduction removes them with four electrons per O₂ and two per H₂O. These are illustrative relative rates and pool sizes, not calibrated physiological kinetics. Reverse electron transfer, ROS and detailed Q-cycle intermediates are outside this model. It does not turn NADPH or non-redox carriers into respiratory donors.

The model follows the selected cell type and direct ETC/OxPhos conditions; mature RBCs have no respiratory flow. Donor and oxygen controls are local to this flow view and its gold map tracks; they do not alter the existing qualitative metabolite deltas. Changing an inhibitor changes the same map condition. The map shows the model’s settled flow; the open flow view evolves carrier pools over time. Reduced-motion mode uses stationary arrows and stops particles. Closing the view stops its animation loop.

Mechanism references: [mammalian Complex I structure](https://pmc.ncbi.nlm.nih.gov/articles/PMC5027920/), [Complex I reaction in Reactome](https://reactome.org/content/detail/R-HSA-163217), [Complex II electron transfer in Reactome](https://reactome.org/content/detail/R-HSA-163213), and [experimental respiratory coupling and complex-dependent electron flow](https://pmc.ncbi.nlm.nih.gov/articles/PMC3143121/).
