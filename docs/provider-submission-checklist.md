# Provider Submission Checklist

Before a provider plugin can be accepted into the registry, it must pass this checklist.

Listing a provider does not mean it is production verified. The registry status should be honest: draft, experimental, verified, degraded, deprecated, or removed.

## 1. Manifest

- [ ] Includes a valid plugin.json.
- [ ] Uses schemaVersion uw-plugin-v1.
- [ ] Declares plugin ID, name, version, license, coreVersion, country, serviceTypes, homepage, and entrypoint.
- [ ] Declares capabilities using namespaced capability names.
- [ ] Declares auth type and secret references.
- [ ] Declares network domains.
- [ ] Declares artifact types.
- [ ] Declares filesystem policy.
- [ ] Declares Bright Data posture: unsupported, optional, or required.
- [ ] Declares quality status, verification level, last verified date, and limitations.
- [ ] Includes maintainer/support metadata.

## 2. Safety

- [ ] Contains no credentials.
- [ ] Contains no real bills.
- [ ] Contains no customer screenshots.
- [ ] Contains no account numbers.
- [ ] Contains no session cookies.
- [ ] Contains no OAuth tokens.
- [ ] Contains no private deployment URLs.
- [ ] Does not request undeclared domains.
- [ ] Does not write directly to the database.
- [ ] Does not call Bright Data directly.
- [ ] Does not export accounting data directly.

## 3. Fixtures And Tests

- [ ] Includes synthetic or sanitized fixtures.
- [ ] Includes expected normalized output.
- [ ] Includes parser tests.
- [ ] Includes manifest validation test.
- [ ] Tests run without live credentials.
- [ ] Unsupported formats fail with structured errors.
- [ ] Known layout limitations are documented.

## 4. Documentation

- [ ] README explains supported provider flow.
- [ ] README explains unsupported cases.
- [ ] CHANGELOG exists.
- [ ] LICENSE exists.
- [ ] docs/limitations.md exists for real provider plugins.
- [ ] docs/troubleshooting.md exists for real provider plugins.

## 5. Registry Metadata

- [ ] Registry entry points to the package path or package source.
- [ ] Registry entry declares verification level.
- [ ] Registry entry declares Bright Data posture.
- [ ] Registry entry declares known limitations.
- [ ] Registry entry identifies maintainer.
- [ ] Registry status matches actual readiness.
