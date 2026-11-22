# GradSnap design direction

Approved 2026-11-21 (unslop, full process on the landing, client calendar and shared
chrome). Every later screen reuses this; never propose a new direction. Tokens live in
`src/app/globals.css` (`:root` + dark block, Tailwind v4 `@theme inline`).

## Direction

- **Product:** the calendar where Virginia Tech seniors and their parents pick a day in
  Blacksburg and book their graduation photographer.
- **Character:** warm, proud, a little ceremonial.
- **World:** graduation day in Blacksburg: limestone, printed ceremony programmes, photo
  prints on paper, autumn light. Warm paper neutrals, one brick accent.
- **Moments:** on the landing, a real (stand-in) campus photo with a calendar preview built
  in code; in the app, the calendar day with photographers available.
- **Signature:** the graduation day carries a seal (double ring in `--seal`) and the words
  "Your graduation". Only on the landing form, the calendar and the booking confirmation.

## Tokens (light / dark)

| Role | Light | Dark | Notes |
| --- | --- | --- | --- |
| `--background` page | #faf8f4 | #14120f | app screens |
| `--paper` | #f7f4ee | #17140f | landing sections only |
| `--card` | #ffffff | #1d1a16 | |
| `--foreground` primary text | #1f1b16 | #f3efe8 | 16:1 |
| `--muted-foreground` secondary | #675e53 | #b3a999 | >= 5.4:1 on page and muted |
| `--secondary` raised | #efe9df | #2a2621 | secondary buttons, active rows |
| `--muted` | #f1ece4 | #2a2621 | |
| `--border` hairline | #e6e0d6 | #36302a | decorative |
| `--input` control edge | #8a8074 | #857b6f | 3.9:1 on card |
| `--primary` brick accent | #9b3a24 | #e8957c | white / dark text 6.9 / 7.4:1 |
| `--accent` selected tint | #f6e4dc / #7a2a18 | #3a2620 / #f4c2b1 | bg / text |
| `--seal` | #9b3a24 | #e8957c | signature only |
| success / warning / destructive | #1b6e36 / #8a5300 / #b42318 | #5ed486 / #f2b759 / #ff7b6e | meaning only |

- **Accent use:** the one primary action per view, selection, the seal. Never on surfaces,
  icons or decoration. Green = available/confirmed/paid, amber = pending, red = destructive.
- **Type:** Instrument Sans for the whole interface (400, 500; 600 rarely). Newsreader 400
  (`font-display`) for large landing headlines only. Sentence case, no tracked uppercase,
  no 700+ headings, `tabular-nums` for figures.
- **Shape:** controls 10px, cards 16px (`rounded-2xl`), panels up to 20px. Pills only for
  real tags. Hairline borders, small neutral shadows, no glows or gradients.
- **Spacing:** 4px grid; page edges 16/24, cards 20-24, sections 96-128 on the landing.
- **Chrome:** sticky bar = page colour + hairline; logo = aperture glyph in brick + name;
  Log in is a text link, one button.
- **Motion:** colour/background transitions only, 160ms `cubic-bezier(0.2, 0, 0, 1)`, a
  0.97 press; no load-in animations, no hover scale. Reduced motion stops everything.
- **Photos:** Wikimedia Commons stand-ins (CC0 / CC BY / CC BY-SA, licence checked, no
  named people) from `src/lib/placeholder-photos.ts`, credited in the footer; landing and
  empty states only, never as a photographer's portfolio or profile photo.
- **A11y:** text >= 4.5:1, 44px targets, visible 2px focus ring in `--ring`, reduced
  motion, responsive from 360px.
