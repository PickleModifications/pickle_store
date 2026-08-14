# TEBBY.md - pickle_store

## Overview
pickle_store ("Pickle Tebex Store") is a FiveM resource that gives a server an in-game
monetization store. Players open a NUI store with a command (default `/donate`, set by
`Config.StoreCommand`), buy real-money coin packages through Tebex, and spend an in-game
coin currency (default "Diamonds") on products whose effects are executed as configurable
server/client commands. It also ships a daily spin wheel and admin coin-grant commands.

## Code design
The resource follows a bridge + module + core layout declared in `fxmanifest.lua`:

- **Bridge layer** (`bridge/**`): abstracts the framework/inventory. `bridge/esx`,
  `bridge/qb`, `bridge/ox`, and `bridge/custom` each define the same globals
  (`ShowNotification`, `GetIdentifier`, `AddOwnedVehicle`, `Inventory.*`, `SetPlayerJob`,
  etc.). `bridge/target/*` and `bridge/xp/*` are optional integrations. Only one framework
  bridge is active at runtime.
- **Modules** (`modules/**`): `modules/api/{shared,server,client}.lua` is the core store
  engine — product storage, Tebex transaction redemption, coin add/remove, purchase flow,
  and the daily spin. `modules/ui/client.lua` drives the NUI. Files are globbed by suffix
  (`shared.lua`, `server.lua`, `client.lua`).
- **Core** (`core/{shared,server,client}.lua`): small shared helpers and customer-editable
  extension code. It loads last on both sides, so all module/bridge globals are available
  to it.

Data lives in MySQL tables (`pts_users`, `pts_products`, `pts_pending_transactions`,
`pts_redeemed_transactions`) that are created with `CREATE TABLE IF NOT EXISTS` inside
`MySQL.ready(...)` in `modules/api/server.lua` — there is no separate `.sql` schema file in
the repo. Per-player state is cached in the `UserInfo` table (keyed by server id) in
`modules/api/server.lua` and persisted with `UpdateUser`.

Products and rewards are executed through a shared command system: a product/prize holds a
list of command strings (e.g. `"pts_givecoins 100"`), and `GetCustomCommand`
(`modules/api/shared.lua`) resolves each against `Config.CustomCommands`, building
`purchaseCheckServer`/`onPurchaseServer` closures. Commands not found in config fall back to
`ExecuteCommand` via `GetCommandReplaced`. The daily spin (`pickle_store:spinWheel`) and the
playtime-reward loop both reuse this same `{ "command string", { fields } }` shape.

## Important files
| Path | Why it matters |
| --- | --- |
| `fxmanifest.lua` | Load order, NUI page, `files`, and `escrow_ignore` list. |
| `config.lua` | All customer-facing settings: store command, Tebex keys, coin currency, daily spin, custom commands, playtime rewards. |
| `config_sv.lua` | Server-only settings and `ConfigSV.WebhookHandler` (Discord logging). |
| `modules/api/server.lua` | Store engine: DB tables, Tebex redemption, coins, purchases, daily spin, admin commands. |
| `modules/api/shared.lua` | `GetCustomCommand` / product info helpers shared by client and server. |
| `modules/api/client.lua` | Client store logic and command execution. |
| `modules/ui/client.lua` | NUI bridge (store + spin wheel UI). |
| `core/server.lua` | Identifier helpers and customer-extensible server logic (time-played rewards live here). |
| `core/shared.lua` | Shared utility functions (`debugPrint`, formatting, `GetItemLabel`). |
| `bridge/*/server.lua` | Per-framework `ShowNotification`, money, job, vehicle, inventory functions. |
| `nui/` | Built store UI shipped to players; `web/` is the React/Vite source it is built from. |

## Intended behaviors
- **Escrow protection.** `fxmanifest.lua` has an `escrow_ignore` list. Only `config.lua`,
  `config_sv.lua`, `core/*`, `bridge/**`, and the locale files are meant to be edited by
  customers; `modules/**` and the NUI are escrow-protected. Prefer implementing customer
  features in `config.lua` + `core/*` rather than editing `modules/**`.
- **DB schema is created in Lua, not SQL.** Tables come from `CREATE TABLE IF NOT EXISTS`
  in `modules/api/server.lua`. There is intentionally no committed `.sql` file; the
  `__INSTALL` folder referenced by `escrow_ignore` is not tracked here.
- **`Config.IdentifierPrefix` / `Config.IdentifierColumn` are deliberate.** Changing the
  prefix resets existing coin accounts (documented in config). The identifier column name is
  templated into every query via `GetIdentifierColumn()`.
- **Tebex verification is real.** `RedeemTransaction` calls `plugin.tebex.io` with
  `sv_tebexSecret`; pending/redeemed transaction tables prevent double redemption. This is
  by design, not dead code.
- **Coin packages auto-hide.** Packages in `Config.CoinCurrency.packages` are hidden from the
  product grid on purpose.

## Common issues & fixes
- **Store won't open / no products:** `Config.TebexStoreUrl` and `Config.TebexApiKey` must be
  set, and `sv_tebexSecret` must be a valid convar for redemption to work.
- **Item images missing:** `Config.ItemImageFolder` must point at your inventory's image path
  (e.g. `nui://ox_inventory/web/images`) with no trailing slash.
- **Wrong coin accounts / reset balances:** almost always a changed `Config.IdentifierPrefix`
  or `Config.IdentifierColumn`.
- **Custom rewards do nothing:** the command string must resolve to a `Config.CustomCommands`
  entry or a valid server command; check `Config.Debug = true` output from `debugPrint`.

## Conventions
- Lua 5.4 (`lua54 'yes'`), tabs/4-space indentation matching surrounding code, and global
  functions (the codebase relies on cross-file globals, so bridge/module functions are not
  `local`).
- Reuse the shared command system (`GetCustomCommand` + the `{ "cmd", { fields } }` shape)
  for anything that grants rewards rather than hand-rolling item/coin logic.
- Put customer-configurable behavior in `config.lua` and implement it in `core/*` or the
  bridge so it stays outside escrow-protected `modules/**`.
- Guard DB reads/writes with the `GetIdentifierColumn()` helper; never hardcode the column.
- Do not edit the `version` field in `fxmanifest.lua`; it is bumped automatically.
