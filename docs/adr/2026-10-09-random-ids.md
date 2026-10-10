# Random IDs instead of sequential keys

- Status: accepted
- Date: 2026-10-09

## Context

Sequential keys like `SHOP-123` collide when two branches create items at the same time. Avoiding that needs a central allocator, which is the kind of server this project removes.

## Decision

IDs have the form `<TYPE>-<8 random Crockford base32 chars>`, for example `ST-37MPP7WD`. CI rejects duplicates. The extension may *display* short aliases, but they are never stored.

## Consequences

- No coordination is needed and branches never collide.
- IDs are less memorable, which we mitigate with ID chips, copy-on-click and search.
