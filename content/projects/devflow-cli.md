---
title: DevFlow CLI
description: A developer productivity CLI that wires together git, GitHub PRs, Jira tickets, and Slack notifications into a single automated workflow.
tags: [Go, CLI, GitHub API, Cobra]
github: https://github.com
featured: true
order: 2
---

## Overview

DevFlow automates the repetitive parts of a PR-based workflow: branch creation named after Jira tickets, draft PRs with auto-generated descriptions, status updates posted to Slack, and reminder nudges on stale reviews.

## Architecture

Built with [Cobra](https://cobra.dev) and a plugin system so teams can add custom steps. Each workflow step is an interface with `Run(ctx) error` — the core binary ships six built-in steps and loads `.devflow/plugins/*.so` at startup.

## Key Design Decisions

- **Single binary**: cross-compiled for macOS, Linux, Windows via GoReleaser
- **Token storage**: OS keychain via `zalando/go-keyring` — no plaintext secrets
- **Offline first**: local SQLite cache so `devflow status` works without network
