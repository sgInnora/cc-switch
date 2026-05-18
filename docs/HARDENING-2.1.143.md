# Claude Code 2.1.143 Configuration Hardening Reference

This document is the authoritative reference for the policy tables enforced by
`src-tauri/src/services/provider/live.rs`. It explains which environment
variables and `settings.json` keys this fork refuses to write, and why.

The fork does **not** bypass, weaken, or evade any Claude Code security
mechanism (hard block, managed policy, Sandbox Runtime, attestation, stop-hook
cap, organization policy). It only narrows what cc-switch itself writes to
disk on behalf of the user.

## 1. Baseline

| Item | Value |
|---|---|
| Target Claude Code release | `2.1.143` |
| Compatible immediate predecessor | `2.1.133` (stable channel) |
| Version probe | `npm view @anthropic-ai/claude-code version dist-tags` |
| Enforcement source of truth | `src-tauri/src/services/provider/live.rs` |
| Test source of truth | `src-tauri/src/services/provider/live.rs` (unit tests) |

## 2. Protected categories

### 2.1 Retired environment variables

Present in `2.1.133`, removed in `2.1.143`. Writing them in `~/.claude/settings.json`
is a no-op in `2.1.143+` and almost always indicates stale or copy-pasted
configuration. The fork rejects these to keep user configs clean.

- `CLAUDE_CODE_AGENT_COST_STEER`
- `CLAUDE_CODE_DISABLE_AGENTS_FLEET`
- `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE`

### 2.2 Managed / runtime environment variables

Set by Claude Code itself at runtime, or used as control-plane signals. A
provider config (which cc-switch persists and re-applies) is the wrong place
to set these — letting them through can redirect credential snapshots, fake
the runtime version, or interfere with managed/supervised mode.

| Key | Risk |
|---|---|
| `CLAUDE_BG_AUTH_SNAPSHOT_PATH` | **High** — points to background auth snapshot file; a user-set value can redirect a credential dump |
| `CLAUDE_BG_TCC_DISCLAIMED` | macOS TCC disclaim state |
| `CLAUDE_CODE_MID_CONVERSATION_SYSTEM` | Mid-conversation system fallback signal |
| `CLAUDE_CODE_RESUME_PROMPT` | Resume prompt state |
| `CLAUDE_CODE_SUPERVISED` | Managed/supervised flag |
| `CLAUDE_CODE_TEE_SDK_STDOUT` | Tee SDK stdout to host |
| `CLAUDE_CODE_VERSION` | Runtime self-version (impersonation risk) |
| `CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK` | Bedrock byte watchdog |

### 2.3 Governance settings keys

These are admin-policy keys in `~/.claude/settings.json`. They can disable
user hooks, force managed-only mode, or override permission/MCP rule sets.
They are out-of-scope for a provider switcher and the fork refuses to write
them via provider config or common snippets.

- `allowManagedHooksOnly`
- `allowManagedMcpServersOnly`
- `allowManagedPermissionRulesOnly`
- `allowedHttpHookUrls`
- `disableAgentView`
- `disableAllHooks`
- `disableRemoteControl`
- `disableSkillShellExecution`
- `httpHookAllowedEnvVars`
- `policySettings`

## 3. Explicitly preserved (legitimate user configuration)

These are normal user-tunable keys introduced or expanded in `2.1.143`.
The fork pass-throughs them unchanged.

| Key | Purpose |
|---|---|
| `ANTHROPIC_WORKSPACE_ID` | Workspace selection |
| `CLAUDE_CODE_MAX_TURNS` | Per-task turn cap |
| `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` | Plugin transport hardening |
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | Stop-hook cap tuning |
| `CLAUDE_MEMORY_STORES` | Multi-store memory selection |
| `CLAUDEMD_PATH` | Custom `CLAUDE.md` location |
| `bgIsolation` | Background isolation toggle (settings key) |

## 4. Enforcement points

| Layer | File | Behavior |
|---|---|---|
| Save / update provider | `src-tauri/src/services/provider/mod.rs` | `validate_claude_settings_policy` rejects any protected key in `settings_config` |
| Common config snippet | `src-tauri/src/commands/config.rs` | Same policy applied before writing the snippet; legacy `set_claude_common_config_snippet` reuses it |
| Live write | `src-tauri/src/services/provider/live.rs` | `sanitize_claude_settings_for_live` strips protected keys and logs each removal (defence in depth for old DB entries) |

## 5. Tests

Unit tests live next to the implementation in `live.rs`:

- `validate_claude_settings_policy_rejects_v143_protected_keys`
- `validate_claude_settings_policy_rejects_bg_auth_snapshot_env`
- `sanitize_claude_settings_removes_v143_protected_keys_before_live_write`
- `sanitize_claude_settings_strips_expanded_governance_keys`
- `sanitize_claude_settings_preserves_compatible_bgisolation_toggle`
- `validate_provider_settings_rejects_claude_v143_protected_env` (in `mod.rs`)
- `validate_common_config_snippet_rejects_claude_v143_protected_env` (in `config.rs`)

## 6. Reproducible verification

```bash
date -u
npm view @anthropic-ai/claude-code version dist-tags

cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --lib --tests -- -D warnings
cargo test  --manifest-path src-tauri/Cargo.toml --lib
cargo audit --file src-tauri/Cargo.lock

pnpm install --frozen-lockfile
pnpm run typecheck
pnpm test:unit
pnpm run build:renderer
pnpm audit
```

## 7. Maintenance policy

- When `npm view @anthropic-ai/claude-code version dist-tags` reports a new
  `latest`, re-diff its `env_vars` list against the version currently encoded
  in `live.rs` and update `MANAGED_CLAUDE_CODE_ENV_KEYS` accordingly.
- When new `settings.json` governance keys appear, extend
  `MANAGED_CLAUDE_SETTINGS_KEYS` and add a unit test.
- Keep the error message in `validate_claude_settings_policy` aligned with the
  current Claude Code version string, and update the matching test assertions
  in the same commit.
