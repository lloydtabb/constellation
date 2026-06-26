# Constellation — Project Context

This file is for resuming development with Claude. Paste it into a new Claude conversation to pick up where we left off.

---

## What this is

A mobile-first star field word game. The player is given a word and must find each letter hidden in a field of stars. Each letter of the alphabet is represented as a **constellation** — a small set of stars connected by lines in a simple geometric shape. The constellations are scattered across the field, rotated and skewed so they aren't immediately obvious.

**Core mechanic:**
- A target word is shown at the top (e.g. STAR, MOON, NOVA)
- The star field contains constellations for every letter in the word, plus decoy constellations
- Only stars that belong to letters in the target word respond to hover/touch — decoys are invisible/inert
- The player hovers over a star to light it up, then drags between stars to draw connecting lines
- When all correct edges of a constellation are drawn, the letter is "found" and its tile lights up
- Find all letters in the word to win

**UI:**
- Word tiles across the top left
- Reveal button (shows solution in green) and A–Z alphabet reference button top right
- New word button at the bottom
- Designed for phone screen (390px wide portrait)

---

## Current state of the code

The working game is in `index.html` in this repo. Key things to know:

### Alphabet definitions
Each letter is defined by:
- `pts` — array of [x,y] points on a 0–4 × 0–4 grid
- `edges` — pairs of point indices that should be connected

Letters currently defined: A B C D E F G H I J K L M N O P R S T U V W X Y Z
(Q was dropped for simplicity)

### Constellation placement
- Letters are placed on a 3-column × 4-row grid
- Each constellation is randomly scaled, rotated, and skewed so it's not immediately recognizable
- Word letters are interactive; decoy letters are completely inert (don't light up on hover)

### Interaction
- Mouse: hover to find stars, click-drag between stars to draw lines
- Touch: tap to find, drag to connect — touch events fully wired
- Correct drawn edges glow blue, wrong connections show red
- When all edges of a letter are correctly drawn, it turns green and the word tile lights up

### Word list
`['STAR','MOON','NOVA','MARS','FLUX','GUST','COMET','ORBIT','VEGA','BLAZE','STORM','NIGHT','FROST']`

---

## Things we were thinking about doing next

- Larger/more interesting word list
- Difficulty levels (more decoys, more skew)
- Score / timer
- Streak across multiple words
- Sound effects
- Better visual feedback when a full word is completed
- Possibly a daily word (like Wordle)

---

## How to resume with Claude

1. Upload or paste this file into a new Claude conversation
2. Also paste the contents of `index.html` so Claude has the current code
3. Say what you want to work on next

The original conversation was on claude.ai — search your history for "constellation" or "star field word game" to find it.

---

## GitHub
Repo: `https://github.com/greatestdata/constellation`  
Live game: `https://greatestdata.github.io/constellation`
