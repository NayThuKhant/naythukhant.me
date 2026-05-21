---
title: Why I Write CLI Tools in Go
date: 2025-01-22
summary: After shipping CLIs in Node, Python, and Rust, Go has become my default choice — and the reasons are more boring than you'd expect.
tags: [go, cli, tooling]
featured: true
---

The pragmatic reasons to pick Go for a CLI tool have nothing to do with performance.

## Single binary distribution

`GOOS=darwin GOARCH=arm64 go build` produces a self-contained binary. No runtime, no `node_modules`, no virtualenv. Users `curl` it, `chmod +x` it, and it works. That's the entire distribution story.

Compare that to a Node CLI where you either ship a slow `pkg`-bundled binary or require the user to have the right Node version installed.

## The stdlib is enough

`os/exec`, `net/http`, `encoding/json`, `flag` — for most CLI tasks I reach for no external dependencies. Go's stdlib is extensive, stable, and won't break on the next npm audit.

## Compile-time safety catches whole categories of bugs

I don't write tests for "does this string key exist in this map". The type system handles that. What remains to test is business logic, which is where I want to spend my time.

## When I'd pick something else

Rust for tools where startup latency matters (sub-10ms shells, completions). Python for one-off scripts that need numpy or torch. Node when the tool is already in a JS monorepo and sharing code matters more than distribution.

For anything else: Go.
