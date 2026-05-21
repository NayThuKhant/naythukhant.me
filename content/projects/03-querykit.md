---
title: QueryKit
description: A type-safe, zero-dependency query builder for PostgreSQL in TypeScript. Compose SQL fluently without an ORM.
tags: [TypeScript, PostgreSQL, OSS, library]
links:
  - title: Source
    link: "https://github.com"
    icon: i-simple-icons:github
  - title: Live Demo
    link: "https://example.com"
    icon: i-lucide:external-link
featured: true
---

## Overview

QueryKit lets you compose type-safe SQL queries using a fluent API. Unlike ORMs, it produces plain SQL strings — no magic, no runtime schema introspection, no migrations.

## Usage

```typescript
import { from } from 'querykit'

const { sql, params } = from('users')
  .select('id', 'email', 'created_at')
  .where('active', '=', true)
  .orderBy('created_at', 'DESC')
  .limit(20)
  .build()
// SELECT id, email, created_at FROM users WHERE active = $1 ORDER BY created_at DESC LIMIT 20
```

## Why Not an ORM?

ORMs trade transparency for convenience. When queries get complex, you end up fighting the abstraction. QueryKit stays thin — the mental model is "TypeScript wrapper around SQL", not "objects that happen to persist".
