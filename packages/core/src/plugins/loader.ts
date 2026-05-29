import { readdir, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { loadManifestFile } from "./validate.ts";
import type { ProviderManifest, UtilityWatchProvider } from "./contract.ts";

export interface DiscoveredPlugin {
  dir: string;
  manifest: ProviderManifest;
}

/** Discover valid plugins under a directory. Dirs without plugin.json are skipped; invalid manifests are reported. */
export async function discoverPlugins(
  pluginsDir: string,
): Promise<{ plugins: DiscoveredPlugin[]; problems: string[] }> {
  const plugins: DiscoveredPlugin[] = [];
  const problems: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(pluginsDir);
  } catch {
    return { plugins, problems };
  }
  for (const name of entries) {
    const dir = join(pluginsDir, name);
    const manifestPath = join(dir, "plugin.json");
    try {
      await access(manifestPath, constants.R_OK);
    } catch {
      continue; // not a plugin directory
    }
    const res = await loadManifestFile(manifestPath);
    if (res.ok && res.manifest) plugins.push({ dir, manifest: res.manifest });
    else problems.push(`${name}: ${res.errors.join("; ")}`);
  }
  return { plugins, problems };
}

/** Load and instantiate a provider from a plugin directory (validates the manifest first). */
export async function loadProvider(dir: string): Promise<UtilityWatchProvider> {
  const res = await loadManifestFile(join(dir, "plugin.json"));
  if (!res.ok || !res.manifest) {
    throw new Error(`invalid plugin manifest in ${dir}:\n- ${res.errors.join("\n- ")}`);
  }
  const entry = res.manifest.entrypoint;
  if (!entry) {
    throw new Error(`plugin ${res.manifest.id}: no entrypoint (declarative providers are not loaded as code)`);
  }
  const entryPath = isAbsolute(entry) ? entry : resolve(dir, entry);
  const mod = (await import(pathToFileURL(entryPath).href)) as {
    default?: UtilityWatchProvider;
    provider?: UtilityWatchProvider;
  };
  const provider = mod.default ?? mod.provider;
  if (!provider || !provider.manifest) {
    throw new Error(`plugin ${res.manifest.id}: entrypoint must default-export a provider object with a manifest`);
  }
  return provider;
}
