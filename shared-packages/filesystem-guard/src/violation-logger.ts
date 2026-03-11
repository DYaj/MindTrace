import { appendFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import type { WriteViolation } from './types';

export interface ViolationSummary {
  totalViolations: number;
  violationsByWriter: Record<string, number>;
  firstViolation?: string;
  lastViolation?: string;
}

export class ViolationLogger {
  constructor(private logPath: string) {
    this.ensureLogDirectory();
  }

  logViolation(violation: WriteViolation): void {
    const line = JSON.stringify(violation) + '\n';

    appendFileSync(this.logPath, line, 'utf-8');
  }

  readViolations(filterWriterId?: string): WriteViolation[] {
    if (!existsSync(this.logPath)) {
      return [];
    }

    const content = readFileSync(this.logPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    const violations = lines.map(line => JSON.parse(line) as WriteViolation);

    if (filterWriterId) {
      return violations.filter(v => v.writerId === filterWriterId);
    }

    return violations;
  }

  getSummary(): ViolationSummary {
    const violations = this.readViolations();

    const violationsByWriter: Record<string, number> = {};

    violations.forEach(v => {
      violationsByWriter[v.writerId] = (violationsByWriter[v.writerId] || 0) + 1;
    });

    return {
      totalViolations: violations.length,
      violationsByWriter,
      firstViolation: violations[0]?.timestamp,
      lastViolation: violations[violations.length - 1]?.timestamp
    };
  }

  clearLog(): void {
    if (existsSync(this.logPath)) {
      // Truncate by writing empty string
      appendFileSync(this.logPath, '', { flag: 'w' });
    }
  }

  private ensureLogDirectory(): void {
    const dir = dirname(this.logPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}
