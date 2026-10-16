# INTIQ Retailer Deck

A 9-slide cinematic, interactive presentation that invites innerwear retailers to join INTIQ. Switches between English, Hindi, Marathi and Gujarati. Plain static site (HTML, CSS, JavaScript), no build step.

## Deploy on Vercel

1. Upload these files to the **top level** of a GitHub repository (`index.html` must sit at the root, not inside a folder).
2. In Vercel: **Add New → Project**, import the repo, Application Preset **Other**, Root Directory `./`, **Deploy**.

## Presenting

| Key | Action |
| --- | --- |
| → / Space / Page Down / clicker | Next build, then next slide |
| ← / Page Up | Previous build or slide |
| L | Next language (or the buttons at the top left) |
| F | Full screen |
| N | Speaker notes (English) |
| Esc | Close an opened photo |

## Interactive moments

| Slide | What to do |
| --- | --- |
| 1 Cover | Tap the card and type the retailer's shop name. It appears on the boarding pass (slide 8) and the membership card (slide 9). |
| 2 Scattered schemes | Click 4 times: coins drop into three locked jars, then the jars crack and the points turn to dust. |
| 3 One wallet | Click: coins stream from every category into one wallet. |
| 5 Shop more, get more | Drag the slider or tap Small / Medium / Large shop. The shop climbs the ladder and rewards unlock. |
| 7 and 8 Holidays | Tap any destination to open it full screen (India pin map on slide 7). Tap again to close. |
| 9 Join | Press **Join free** to celebrate. |

## Making changes

| What | Where |
| --- | --- |
| On-screen text, all four languages | `assets/js/i18n.js` |
| Simulator numbers (points rate, level thresholds, shop sizes) | `assets/js/config.js` |
| Photos | `assets/js/photos.js` |
| Logo | `assets/brand/intiq-logo.svg` or `.png` |
| Layout and speaker notes | `index.html` |
| Motion engine | `assets/js/fx.js` · slide behaviour: `assets/js/slides.js` |
| Colours and fonts | `assets/css/deck.css`, `assets/css/retail.css` |

## Confirm before presenting

- Simulator numbers in `config.js` are examples (4% points, level thresholds, shop sizes)
- Example figures on slide 2
- Product categories on slide 3, reward options and level names
- Bonus points and INTIMASIA recognition on slide 9
- Translations: have a native speaker read each language once

Maps: India outline from DataMeet (Survey of India boundary, CC BY 4.0); other countries from world.geo.json (Natural Earth, public domain). Photos: Unsplash License. Fonts: Manrope, Playfair Display, Noto Sans/Serif Devanagari and Gujarati (SIL Open Font License).
