# Ninja Games app: image prompts

Generate each image, export it at the size given, and save it over the file
named in **File**, in `mobile/assets/art/`. The app picks it up on the next reload. No code change is needed.

**Style block.** Paste it at the end of every prompt so all images match:

> Style: premium esports key art, cinematic 3D render, dark near-black background (#04090A), glowing Ninja emerald green accents (#2BE38A), subtle soft rim light, volumetric haze, high detail, clean composition, no text, no letters, no logos, no watermark.

Transparent PNGs: ask for a transparent background, or remove the background afterwards. Keep the subject centred, with roughly 6% empty margin.

---

## 1. Home hero background (the most important image)
- **File:** `home-hero.png`, **1290 × 1500**, portrait, no transparency
- **Prompt:** Night interior of a futuristic gaming lounge seen from a low angle: rows of gaming PCs with emerald RGB light and a glowing lounge area with big TVs, wet reflective floor, neon light strips, depth of field. The top 45% of the image is darker and calmer (text sits there). The bottom fades to pure black. Moody, cinematic, luxury.

## 2. Hero ninja (the player's character on Home)
- **File:** `hero-ninja.png`, **1100 × 1400**, transparent
- **Prompt:** Stylised 3D ninja gamer character in a sleek black tactical suit with emerald glowing trims, wearing a gaming headset over the ninja mask, confident relaxed pose, one hand holding a game controller, emerald eye glow, three-quarter view, full upper body down to the knees.

## 3. PC action card art
- **File:** `card-pc.png`, **900 × 900**, transparent
- **Prompt:** Floating 3D gaming setup: curved ultrawide monitor showing an abstract emerald glow, mechanical RGB keyboard and mouse in front, compact glass tower PC with emerald fans beside it, slight isometric angle, floating with a soft shadow below.

## 4. Console action card art
- **File:** `card-console.png`, **900 × 900**, transparent
- **Prompt:** Floating 3D next-gen white game console standing upright next to a white and black wireless game controller, cool blue (#63B3FF) rim light mixed with a little emerald, slight isometric angle, soft shadow below. Generic design, no brand marks.

## 5. PC token coin
- **File:** `coin-pc.png`, **512 × 512**, transparent
- **Prompt:** A thick metallic gaming coin seen at a slight angle, a stylised shuriken (ninja star) engraved in the centre, emerald glass enamel, polished dark-steel rim, emerald glow.

## 6. PlayStation token coin
- **File:** `coin-ps.png`, **512 × 512**, transparent
- **Prompt:** Same coin design as the PC coin, but with blue glass enamel (#63B3FF), a game-controller silhouette engraved in the centre, and a blue glow.

## 7. Tournament banner
- **File:** `event-banner.png`, **1600 × 900**, no transparency
- **Prompt:** An emerald crystal esports trophy on a dark stage with spotlights from above, emerald confetti in the air, crowd silhouettes blurred in the background. The trophy sits on the right third; the left side stays dark for text.

## 8. Food & hookah promo
- **File:** `promo-food.png`, **1200 × 800**, no transparency
- **Prompt:** Top-down cinematic food photography on a dark slate table: a smash burger, golden fries, an iced energy drink with condensation, and a glass of karak tea, emerald neon reflections, steam. The right side is darker for text.

## 9. Empty-state ninja (shown when you have no friends or orders yet)
- **File:** `ninja-empty.png`, **800 × 800**, transparent
- **Prompt:** Cute chibi version of the emerald ninja gamer sitting cross-legged, holding a controller and looking up curiously, soft emerald glow.

## 10. App icon
- **File:** `../icon.png`, **1024 × 1024**, no transparency
- **Prompt:** App icon: a bold emerald ninja mask with glowing eyes, centred on a deep near-black-to-emerald radial gradient, glossy, simple and readable at small size. Fill the whole square edge to edge; do not draw rounded corners (the phone adds them).

## 11. Splash screen
- **File:** `splash.png`, **1284 × 2778**, no transparency
- **Prompt:** Minimal dark splash: pure #04090A background with a subtle emerald radial glow in the centre and faint smoke, leaving the centre empty for the logo.
