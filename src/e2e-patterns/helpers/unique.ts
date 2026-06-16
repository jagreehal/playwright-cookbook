import type { TestInfo } from '@playwright/test';

export function unique(testInfo: TestInfo, prefix: string): string {
  return `${prefix}-${testInfo.project.name}-${testInfo.workerIndex}-${testInfo.retry}-${Date.now()}`;
}
