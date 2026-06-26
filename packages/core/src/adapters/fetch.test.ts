import { test } from "node:test";
import assert from "node:assert/strict";
import { isBlockedIp, hostAllowed } from "./fetch.ts";

test("isBlockedIp blocks loopback, private, link-local and metadata ranges", () => {
  for (const ip of [
    "127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.169.254", // AWS/GCP metadata
    "172.16.0.1", "172.31.255.255", "0.0.0.0", "0.1.2.3",
    "100.64.0.1", "100.127.255.255", // carrier-grade NAT
    "::1", "::", "fe80::1", "fc00::1", "fd12:3456::1",
    "::ffff:127.0.0.1", "::ffff:7f00:1", // IPv4-mapped, dotted and hex form
  ]) {
    assert.equal(isBlockedIp(ip), true, `${ip} should be blocked`);
  }
});

test("isBlockedIp allows ordinary public addresses", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "100.63.255.255", "93.184.216.34", "2606:4700::1111"]) {
    assert.equal(isBlockedIp(ip), false, `${ip} should be allowed`);
  }
});

test("hostAllowed: empty allowlist permits any host", () => {
  assert.equal(hostAllowed("portal.example.com", []), true);
});

test("hostAllowed: matches exact host and wildcard suffix", () => {
  assert.equal(hostAllowed("portal.example.com", ["*.example.com"]), true);
  assert.equal(hostAllowed("example.com", ["*.example.com"]), true);
  assert.equal(hostAllowed("portal.example.com", ["portal.example.com"]), true);
  assert.equal(hostAllowed("evil.com", ["*.example.com"]), false);
  assert.equal(hostAllowed("notexample.com", ["*.example.com"]), false);
});
