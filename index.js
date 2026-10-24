/**
 * Host half of the provider developer-role compatibility bundle.
 *
 * The whole feature is the Client section on this bundle's Plugin Center page:
 * it reads the registered providers and writes `compat.supportsDeveloperRole`
 * through the settings Remote, so provider adapters stop serializing
 * instructions with the OpenAI `developer` role. This half registers nothing.
 */
export function apply() {}
