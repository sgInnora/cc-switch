<div align="center">

# CC Switch — Security-Hardened Fork

**A defensively-hardened fork of [farion1231/cc-switch](https://github.com/farion1231/cc-switch)**

Tracks Claude Code `2.1.143` internal env vars, deep-link/proxy redaction, skill ZIP DoS guards, usage-script sandbox limits, and CI secret leak fixes — without bypassing any Claude Code security mechanism.

[Upstream README](README_UPSTREAM.md) · [中文](README_ZH.md) · [日本語](README_JA.md) · [Hardening report](docs/HARDENING-2.1.143.md)

</div>

---

## Why this fork exists

Upstream `cc-switch` is an excellent multi-provider switcher for Claude Code / Codex / Gemini CLI. This fork adds a defense-in-depth layer for users who:

- Run cc-switch alongside Claude Code `2.1.143+` and don't want **provider configs** to accidentally write **Claude Code internal env vars** (e.g. `CLAUDE_BG_AUTH_SNAPSHOT_PATH`, `CLAUDE_CODE_VERSION`, `CLAUDE_CODE_SUPERVISED`) into `~/.claude/settings.json`.
- Want **deep-link logs** to redact URL query values rather than print API keys / OAuth tokens to disk.
- Want the **local API proxy** to refuse non-loopback bind addresses and reject `127.0.0.1.evil.com` style prefix-spoofing hostnames.
- Want **skill ZIP imports** to have explicit size, entry-count, and extracted-size budgets (no ZIP bombs).
- Want **usage-script** execution to enforce QuickJS source-size, CPU timeout, stack, and HTTP response caps.
- Want the **release workflow** to never echo signing-key prefixes on malformed-secret error paths.

> **Explicit non-goal:** this fork does **not** bypass, weaken, or evade any Claude Code security mechanism (hard block, managed policy, Sandbox Runtime, attestation, stop-hook cap, org policy). It only narrows what cc-switch itself silently writes to disk.

## What's different vs upstream

| Area | Upstream behavior | This fork |
|---|---|---|
| Claude provider save | Only validates JSON shape | Also rejects Claude Code `2.1.143` retired/managed env + 10 governance settings keys |
| Claude common-config snippet | Only validates JSON syntax | Same protection as above (prevents batch injection across providers) |
| Live settings write | Strips 4 internal cc-switch fields | Also strips 18 protected keys (env + governance) and logs each removal |
| Deep-link logging | Logs full URL incl. query values | Redacts query values, preserves scheme/path/key-names only |
| Local proxy bind | Any address accepted | Loopback-only (`127.0.0.1`, `::1`, `localhost`), port >= 1024 |
| Local proxy URL detection | Prefix matching (`startsWith`) | Real URL parsing (`url::Host`), rejects `127.0.0.1.evil.com` |
| Skill ZIP download | No explicit budget | 50 MiB download cap, 200 MiB extracted cap, 10 000 entries max |
| Usage-script runtime | No explicit limits | QuickJS source/CPU/stack/HTTP response caps |
| Renderer bundle | ~3.77 MB main chunk | ~120 KB main chunk (Prettier lazy-loaded, manual splits) |
| CI release workflow | Prints first 10 chars of bad `TAURI_SIGNING_PRIVATE_KEY` on error | Removed; only structural error message |
| Rust deps | `cargo audit` had vulnerable transitives | Vulnerable lines upgraded; `vulnerabilities.found=false` |
| Frontend deps | `pnpm audit` had findings | 0 findings post-upgrade |

## Quick start

Install / build is identical to upstream — see [README_UPSTREAM.md](README_UPSTREAM.md) for binaries, dev setup, and feature overview.

```bash
git clone https://github.com/sgInnora/cc-switch
cd cc-switch
pnpm install
pnpm tauri build   # or: pnpm tauri dev
```

## Evidence matrix (Claude Code 2.1.143)

Every protected key below is referenced against the published Claude Code `2.1.143` distribution:

```bash
$ npm view @anthropic-ai/claude-code version dist-tags
latest = 2.1.143    next = 2.1.143    stable = 2.1.133
```

### Retired env (present in v133, removed in v143)

| Key | Status |
|---|---|
| `CLAUDE_CODE_AGENT_COST_STEER` | Removed by upstream; rejected here |
| `CLAUDE_CODE_DISABLE_AGENTS_FLEET` | Removed by upstream; rejected here |
| `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE` | Removed by upstream; rejected here |

### Managed / runtime env (new in v143, written by Claude Code itself)

| Key | Risk |
|---|---|
| **`CLAUDE_BG_AUTH_SNAPSHOT_PATH`** | **High** — points to background auth snapshot file; user-set value can redirect credential dump |
| `CLAUDE_BG_TCC_DISCLAIMED` | macOS TCC disclaim state |
| `CLAUDE_CODE_MID_CONVERSATION_SYSTEM` | Mid-conversation system fallback |
| `CLAUDE_CODE_RESUME_PROMPT` | Resume prompt state |
| `CLAUDE_CODE_SUPERVISED` | Managed/supervised flag |
| `CLAUDE_CODE_TEE_SDK_STDOUT` | Tee SDK stdout to host |
| `CLAUDE_CODE_VERSION` | Runtime self-version |
| `CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK` | Bedrock byte watchdog |

### Governance settings keys (admin-only in v143)

`disableAllHooks`, `allowManagedHooksOnly`, `allowManagedMcpServersOnly`, `allowManagedPermissionRulesOnly`, `allowedHttpHookUrls`, `disableAgentView`, `disableRemoteControl`, `disableSkillShellExecution`, `httpHookAllowedEnvVars`, `policySettings`

These can disable user hooks, force managed-only mode, or override permission/MCP rules — they are admin-policy keys, not provider-config keys, so cc-switch refuses to write them.

### Keys we explicitly **do not** block (legitimate user config)

`ANTHROPIC_WORKSPACE_ID`, `CLAUDE_CODE_MAX_TURNS`, `CLAUDE_CODE_PLUGIN_PREFER_HTTPS`, `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`, `CLAUDE_MEMORY_STORES`, `CLAUDEMD_PATH`, `bgIsolation`

These are user-tunable settings introduced in v143 — pass-through preserved.

Full reference list with policy tables: [docs/HARDENING-2.1.143.md](docs/HARDENING-2.1.143.md)

## Sync policy with upstream

| Aspect | Policy |
|---|---|
| Upstream tracking | Periodic `git fetch upstream` + rebase of fork-specific commits |
| Conflict resolution | Always preserve fork's `provider/live.rs` policy tables and `sanitize_claude_settings_for_live` expansions |
| Claude Code version upgrades | When `npm view @anthropic-ai/claude-code version` advances, re-run `diff` against the new env_vars dump and update `MANAGED_CLAUDE_CODE_ENV_KEYS` |
| Upstream features | All upstream features are preserved unless they conflict with a hardening guarantee |

## Verification (reproducible)

```bash
# Time + version baseline
date -u
npm view @anthropic-ai/claude-code version dist-tags

# Rust
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --lib --tests -- -D warnings
cargo test  --manifest-path src-tauri/Cargo.toml --lib
cargo audit --file src-tauri/Cargo.lock

# Frontend
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test:unit
pnpm run build:renderer
pnpm audit
```

Latest run on this fork: **1195 lib tests pass · 17 v143-targeted tests pass · 241 frontend tests pass · `cargo audit` 0 vulnerabilities · `pnpm audit` 0 vulnerabilities**.

## Disclosure & responsibility

- This fork is **not affiliated with Anthropic**.
- This fork is **not affiliated with upstream** `farion1231/cc-switch` beyond the MIT license — no endorsement implied or claimed.
- Issues should be opened against this fork: [github.com/sgInnora/cc-switch/issues](https://github.com/sgInnora/cc-switch/issues).
- For upstream feature requests / sponsorships, see the [upstream README](README_UPSTREAM.md).

## License

MIT — inherited from upstream.

## Credits

- Original project: **Jason Young** ([@farion1231](https://github.com/farion1231)) — [farion1231/cc-switch](https://github.com/farion1231/cc-switch)
- This fork: **[@sgInnora](https://github.com/sgInnora)** — hardening targeting Claude Code `2.1.143`.
