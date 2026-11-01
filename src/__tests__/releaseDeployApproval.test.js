import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');

describe('production deployment approval gate', () => {
  it('does not deploy on pushes to main', () => {
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch' && inputs.approve_production_deploy");
    expect(workflow).toMatch(/approve_production_deploy:[\s\S]*?default: false/);
  });
});
