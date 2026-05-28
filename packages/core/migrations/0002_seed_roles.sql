-- Canonical roles and capabilities (see PLAN.md §5 Roles And Capabilities).
-- Capability-based checks; role names are never hardcoded in logic.

INSERT INTO roles (code, name, description) VALUES
  ('owner', 'Owner', 'First administrator and recovery authority. Manages everything.'),
  ('admin', 'Admin', 'Configure system, install providers, manage policies and users.'),
  ('operator', 'Operator', 'Run jobs, inspect failures, rerun, add notes.'),
  ('reviewer', 'Reviewer', 'Approve or reject bills and request provider fixes.'),
  ('auditor', 'Auditor', 'Read-only access to runs, artifacts, exports, and decisions.');

-- Owner gets every capability.
INSERT INTO role_capabilities (role_id, capability)
SELECT r.id, c.capability
FROM roles r
JOIN (
  SELECT 'providers.install' AS capability
  UNION ALL SELECT 'providers.activate'
  UNION ALL SELECT 'providers.deactivate'
  UNION ALL SELECT 'providers.validate'
  UNION ALL SELECT 'accounts.create'
  UNION ALL SELECT 'jobs.run'
  UNION ALL SELECT 'runs.inspect'
  UNION ALL SELECT 'bills.review'
  UNION ALL SELECT 'bills.export'
  UNION ALL SELECT 'registry.publish'
  UNION ALL SELECT 'policies.manage'
  UNION ALL SELECT 'users.manage'
  UNION ALL SELECT 'settings.manage'
  UNION ALL SELECT 'setup.complete'
  UNION ALL SELECT 'ai.diagnose'
) c
WHERE r.code = 'owner';
