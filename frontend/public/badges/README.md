# Achievement badge artwork

Drop the badge images here using these **exact filenames** — the app already
references these paths (`/badges/<name>.png`) and will pick them up automatically,
with no code changes needed:

| File                    | Achievement   |
|--------------------------|---------------|
| `first-steps.png`        | First Steps   |
| `perfectionist.png`      | Perfectionist |
| `on-fire.png`             | On Fire       |
| `century-club.png`       | Century Club  |
| `speed-master.png`       | Speed Master  |
| `top-10.png`              | Top 10        |
| `most-improved.png`      | Most Improved |
| `quiz-master.png`        | Quiz Master   |

**Format**: PNG with a transparent background, square (e.g. 256x256 or 512x512),
hexagonal badge art like the reference image (the app renders it at ~84px, so
anything from 128px up looks crisp).

**Fallback behavior**: until a given file exists, that badge automatically shows
the current vector hexagon icon instead — nothing breaks, and each badge upgrades
to the real artwork the moment its file is added.
