# Schema migrations

Every file format has a version in its `schema` marker (`gitleaf/doc@1`). Changing a format is an API change: it needs an ADR, a version bump of the schema, and a migration here named `<kind>-<from>-to-<to>.ts` that maps a parsed document of the old version to the new one without touching unrelated keys.

Version 1 of every format is the first, so this folder holds no migrations yet.
