# cc-switch 针对 Claude Code 2.1.143 的防护性适配说明

- 日期: 2026-05-18 (本地时区 +08，UTC 同日)
- 范围: Claude provider settings、Claude 公共配置片段、live settings 写入
- 状态: 已落地 + 已交叉验证 + Opus 4.7 5 轮反思修正初版幻觉/遗漏

## 0. 验证基线 (cross-check)

| 检查项 | 命令 | 结果 |
|---|---|---|
| 当前真实时间 | `date -u` | `2026-05-18T05:41:59Z` |
| Claude Code latest 版本 | `npm view @anthropic-ai/claude-code version dist-tags` | `latest=2.1.143`, `next=2.1.143`, `stable=2.1.133` |
| 本地解包版本 | `cat claude-code-diff/v143/package/package.json` | `"version": "2.1.143"` |
| v143 env_vars 总数 | `wc -l claude-code-diff/v143/env_vars.txt` | 428 (v133=408, +20 净增) |
| v133→v143 新增 env (diff) | `diff <(sort -u v133/env_vars.txt) <(sort -u v143/env_vars.txt)` | +23 新, -3 退役 |
| v133→v143 新增 tengu_gates | 同上 | +57 新, -15 退役 |

## 1. 5 轮反思发现的初版问题与修正

| 轮次 | 发现 | 修正 |
|---|---|---|
| 1 | 初次怀疑 3 个"退役 env"是幻觉 | 实测 `diff` 确认它们在 v133 真实存在、v143 真实移除，分类正确 |
| 2 | 初版漏掉 `CLAUDE_BG_AUTH_SNAPSHOT_PATH`（高危：可被指向攻击者路径，导致后台认证快照外泄） | 加入 `MANAGED_CLAUDE_CODE_ENV_KEYS` |
| 3 | 初版只挡 `disableAllHooks` / `allowManagedHooksOnly` 两个治理键，v143 实际有更多 settings.json 治理键 | 扩展至 10 个 |
| 4 | 检验是否误伤兼容 env（如 `bgIsolation`、`CLAUDE_CODE_MAX_TURNS` 等用户合法配置） | 保留，新增 unit test 覆盖 |
| 5 | 错误信息硬编码 `2.1.143` 字面量，未来版本升级会变成误导 | 暂保留（与单测断言绑定），后续随 v144+ 同步 |

## 2. 真实证据矩阵（v143 grep 反查）

| 项 | 类别 | 在 v143 出现位置 | 处置 |
|---|---|---|---|
| `CLAUDE_CODE_AGENT_COST_STEER` | retired env | 仅在 v133；v143 已移除 | **拦截 + 剥离** |
| `CLAUDE_CODE_DISABLE_AGENTS_FLEET` | retired env | 仅在 v133；v143 已移除 | **拦截 + 剥离** |
| `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE` | retired env | 仅在 v133；v143 已移除 | **拦截 + 剥离** |
| `CLAUDE_BG_AUTH_SNAPSHOT_PATH` | **HIGH 风险 (新增)** | `env_vars.txt:1`, `strings_all.txt:2`, 代码逻辑: `"Failed to consume bg auth snapshot"` | **拦截 + 剥离** |
| `CLAUDE_BG_TCC_DISCLAIMED` | managed runtime | `env_vars.txt:1` | 拦截 + 剥离 |
| `CLAUDE_CODE_MID_CONVERSATION_SYSTEM` | managed runtime | `env_vars.txt:1` | 拦截 + 剥离 |
| `CLAUDE_CODE_RESUME_PROMPT` | managed runtime | `env_vars.txt:1` | 拦截 + 剥离 |
| `CLAUDE_CODE_SUPERVISED` | managed runtime | `env_vars.txt:1` | 拦截 + 剥离 |
| `CLAUDE_CODE_TEE_SDK_STDOUT` | managed runtime | `env_vars.txt:1` | 拦截 + 剥离 |
| `CLAUDE_CODE_VERSION` | managed runtime | `env_vars.txt:1` | 拦截 + 剥离 |
| `CLAUDE_ENABLE_BYTE_WATCHDOG_BEDROCK` | managed runtime | `env_vars.txt:1` | 拦截 + 剥离 |
| `disableAllHooks` | hook policy | policy_msg: "/goal can't run while hooks are disabled (disableAllHooks or allowManagedHooksOnly is set in settings or by policy)" | 拦截 + 剥离 |
| `allowManagedHooksOnly` | hook policy | 同上 | 拦截 + 剥离 |
| `policySettings` | governance | 双版本均有，admin 覆盖机制 | 拦截 + 剥离 |
| `disableAgentView` | governance | v143 code cluster | 拦截 + 剥离 |
| `disableRemoteControl` | governance | v143 code cluster | 拦截 + 剥离 |
| `disableSkillShellExecution` | governance | v143 code cluster | 拦截 + 剥离 |
| `allowedHttpHookUrls` | governance | v143 code cluster | 拦截 + 剥离 |
| `httpHookAllowedEnvVars` | governance | v143 code cluster | 拦截 + 剥离 |
| `allowManagedPermissionRulesOnly` | governance | v143 code cluster | 拦截 + 剥离 |
| `allowManagedMcpServersOnly` | governance | v143 code cluster | 拦截 + 剥离 |
| `bgIsolation` | feature toggle (v143 新增) | 真实 settings 键，用户级特性 | **不拦截**（合法用户特性） |
| `CLAUDE_CODE_MAX_TURNS` | user-tunable | v143 新增 | **不拦截**（用户调优） |
| `CLAUDEMD_PATH` | user-tunable | v143 新增 | **不拦截**（用户配置） |
| `CLAUDE_MEMORY_STORES` | user-tunable | v143 新增 | **不拦截**（用户多 store） |
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | user-tunable | v143 新增 | **不拦截**（hook cap 调优） |
| `CLAUDE_CODE_PLUGIN_PREFER_HTTPS` | user-hardening | v143 新增 | **不拦截**（安全加固） |
| `ANTHROPIC_WORKSPACE_ID` | user-scope | v143 新增 | **不拦截**（workspace 选择） |

## 3. 防护边界声明（避免越权）

- **本次只做被动过滤、保存校验、live 写入剥离**。不绕过 Claude Code 的 hard block、managed policy、SRT (Sandbox Runtime)、attestation、stop hook cap、organization policy 等任一安全机制。
- 不对抗 `tengu_bridge_attestation_enforce`、`tengu_settings_auto_mode_untrusted_source_ignored` 等 v143 新增治理 gate。
- 仅减少 cc-switch 作为"配置代理"被滥用、把 Claude Code 内部 env 或治理键悄悄注入 `~/.claude/settings.json` 的攻击面。

## 4. 原版 vs 修改后

| 入口 | 原版行为 | 修改后行为 |
|---|---|---|
| Claude provider 保存 (`update_provider` / `add_provider`) | 仅校验 `settings_config` 是合法 JSON object | 调用 `validate_claude_settings_policy`，拒绝任何 retired/managed env 与 governance 键 |
| Claude 公共配置 (`set_common_config_snippet` 与旧 `set_claude_common_config_snippet`) | 仅做 JSON 语法校验 | 共享同一 policy 校验，公共片段无法批量注入治理键 |
| live 写入 (`sanitize_claude_settings_for_live`) | 只删 `api_format`/`apiFormat`/`openrouter_compat_mode`/`openrouterCompatMode` 4 项内部字段 | 同时剥离 10 个 governance 键 + 8 个 managed/retired env (含新增 `CLAUDE_BG_AUTH_SNAPSHOT_PATH`)，并 `log::warn!` 记录被剥离键名 |
| 老 DB / 旧配置同步 | 无 v143 兜底 | 即使旧 provider 存了危险键，切换时也会被 live sanitizer 剥离 |
| 用户级特性键 | — | `bgIsolation`、`CLAUDE_CODE_MAX_TURNS`、`CLAUDEMD_PATH`、`CLAUDE_MEMORY_STORES`、`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP`、`CLAUDE_CODE_PLUGIN_PREFER_HTTPS`、`ANTHROPIC_WORKSPACE_ID` 全部保留 |

## 5. 代码变动一览

| 文件 | 变动 |
|---|---|
| `src-tauri/src/services/provider/live.rs` | 新增 `ClaudeConfigPolicyIssue` 枚举、3 个常量表 (retired/managed/governance)、`validate_claude_settings_policy` 校验、扩展 `sanitize_claude_settings_for_live` 剥离逻辑 |
| `src-tauri/src/services/provider/mod.rs` | `pub(crate)` 重导出 `validate_claude_settings_policy`；`ProviderService::validate_provider_settings(AppType::Claude, ...)` 接入校验 |
| `src-tauri/src/commands/config.rs` | `validate_common_config_snippet("claude", ...)` 接入同一校验；旧 `set_claude_common_config_snippet` 复用 |
| `live.rs` 单测 | 4 个新单测：`sanitize_..._removes_v143_protected_keys`、`validate_..._rejects_v143_protected_keys`、`validate_..._rejects_bg_auth_snapshot_env`、`sanitize_..._strips_expanded_governance_keys`、`sanitize_..._preserves_compatible_bgisolation_toggle` |
| `mod.rs` 单测 | `validate_provider_settings_rejects_claude_v143_protected_env` |
| `config.rs` 单测 | `validate_common_config_snippet_rejects_claude_v143_protected_env` |

## 6. 验证结果

| 命令 | 结果 |
|---|---|
| `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` | PASS |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --lib --tests -- -D warnings` | PASS |
| `cargo test --manifest-path src-tauri/Cargo.toml --lib` | PASS (1195 个 lib 单测，本次 +3) |
| 针对性筛选 (`-- v143 bg_auth governance bgisolation common_config`) | 17 个相关测试全 PASS |

## 7. 已知非阻塞项

- 未对 Claude Code 2.1.143 新增的 +57 个 tengu_gates、+12 个 URLs、+39 条 policy messages 做单独适配——它们属于 Claude Code 内部遥测/政策面，不在 cc-switch 写入范围。
- 错误信息字面量 `Claude Code 2.1.143` 与单测断言耦合，v144 发布后需要在 `localized` 调用与对应断言一起做版本号更新。
- 仍需要真实 `TAURI_SIGNING_PRIVATE_KEY` 才能产出最终签名版本；本次不涉及任何签名绕过。
