import os from "os";

function parseEnvOrigins(raw: string | undefined): string[] {
  if (!raw) return [];

  const hosts = new Set<string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    try {
      const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`http://${trimmed}`);
      hosts.add(url.hostname);
    } catch {
      hosts.add(trimmed.split(":")[0] ?? trimmed);
    }
  }

  return [...hosts];
}

/** Non-loopback IPv4 addresses on this machine (Wi‑Fi, Ethernet, hotspot, etc.). */
export function detectLocalNetworkHostnames(): string[] {
  const hosts = new Set<string>();

  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const iface of interfaces ?? []) {
      if (iface.family !== "IPv4" || iface.internal) continue;
      hosts.add(iface.address);
    }
  }

  return [...hosts];
}

/**
 * Hostnames allowed to load Next.js dev assets (/_next/*, HMR) from other devices.
 * Next.js 16 blocks network-IP origins unless listed in `allowedDevOrigins`.
 */
export function buildAllowedDevOrigins(): string[] {
  const hosts = new Set<string>([
    ...parseEnvOrigins(process.env.ALLOWED_DEV_ORIGINS),
    ...detectLocalNetworkHostnames(),
  ]);

  return [...hosts];
}
