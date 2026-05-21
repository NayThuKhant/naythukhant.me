---
title: Space Explorer
category: web
description: A real-time 3D visualization of the solar system built with Three.js and WebGL, running at 60 fps in the browser.
featured: true
github: https://github.com
liveLink: https://example.com
order: 1
tags:
  - TypeScript
  - Three.js
  - WebGL
  - Vue
---

## Overview

Space Explorer renders a real-time, interactive model of the solar system using Three.js. Users can orbit the camera, click planets for facts, and observe orbital mechanics in simulated time.

## Technical Highlights

- Custom GLSL shaders for atmospheric Rayleigh scattering on planets
- Web Workers for orbital mechanics calculations to keep the main thread free
- Texture streaming via `IntersectionObserver` — only visible assets are loaded
- LOD switching maintains 60 fps on mid-range hardware

## What I learned

Getting consistent frame rates required aggressive frustum culling and instanced rendering for the asteroid belt. The atmospheric shader took the most iteration — physically-based scattering looked great but tanked performance until I baked it into a lookup texture.
