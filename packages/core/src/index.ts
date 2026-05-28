// Public entry for the core package. Plugins import contract types from here.
export * from "./plugins/contract.ts";
export { validateManifest, loadManifestFile } from "./plugins/validate.ts";
export type { ValidationResult } from "./plugins/validate.ts";
