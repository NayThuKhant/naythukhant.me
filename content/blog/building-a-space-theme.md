---
title: Building a Space-Themed UI Without Burning the GPU
date: 2025-03-10
description: Particle effects look great in demos. They look terrible in production when your GPU fan spins up and the rest of the page janks. Here's the approach I settled on after three rewrites.
featured: true
order: 1
summary: How I got animated starfields, neon glows, and particle effects running at 60 fps using canvas, CSS containment, and a few smart trade-offs.
tags:
  - css
  - performance
  - animation
---

Particle effects look great in demos. They look terrible in production when your GPU fan spins up and the rest of the page janks. Here's the approach I settled on after three rewrites.

## The starfield

The first version used 200 `<div>` elements with CSS `animation`. It rendered at 30 fps on my M1 — the layout thrash from animating `opacity` on hundreds of DOM nodes adds up fast.

Canvas is the right tool. A single `<canvas>` composited on the GPU, drawn in `requestAnimationFrame`, with `alpha: true` so the background shows through. 200 stars, each with a randomised twinkle phase using `Math.sin(tick * speed)`, costs about 0.3 ms per frame.

## Glow effects

`box-shadow` with a large blur radius is cheap. `filter: blur()` on a real element is not — it triggers an off-screen compositing layer every frame. Use `box-shadow` for static glow, and pre-baked radial-gradient pseudo-elements for the ambient blobs.

## Containment

Adding `contain: paint` to cards that have hover glows prevents the glow from triggering a full-page repaint. The difference on a page with 20 cards is measurable.

## The takeaway

Profile before optimising. Chrome DevTools' Rendering panel with "Paint flashing" enabled will show you exactly which glows are expensive. Most are not — the rare expensive one usually has a simple fix.
