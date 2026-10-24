# Provider Developer-Role Compatibility

A DSH Web plugin bundle that lists the model providers this profile actually
has on this bundle's page in the Plugin Center, with one checkbox per provider.
Providers the installed pi-ai catalog declares but the profile never added are
not listed.

Checking a provider writes `compat.supportsDeveloperRole = false` into that
provider's `llm-pi-ai` profile through the settings service. The adapter then
serializes system instructions with the `system` role instead of the OpenAI
`developer` role, which gateways that only accept
`system | assistant | user | tool | function` reject with a 400.

## Why not rewrite `developer` messages to `user` messages

The role that a gateway sees is chosen inside the provider adapter
(`@earendil-works/pi-ai`), not by the Harness message roles: a reasoning model
on `openai-completions` / `openai-responses` is sent
`role: "developer"` for its instruction messages whenever
`compat.supportsDeveloperRole` is not `false`. Harness `developer` messages
(tool-registry changes) never reach the wire as `developer` at all: both the
pi-ai and DeepSeek adapters translate them to `system`. Rewriting the request
messages therefore cannot remove the role, while
`compat.supportsDeveloperRole = false` removes it at the serializer.

## Install

```
plugin_manager install_bundle <absolute package directory>
```

The bundle patch inserts one Host row (`llm-provider-compat`); the Client half
contributes `plugins.detail.section` and renders only on this package's own
Plugin Center page.
