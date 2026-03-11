export type WriterCapability =
  | 'write-authoritative'
  | 'write-advisory'
  | 'write-contract'
  | 'write-cache';

export interface WriterIdentity {
  allowedPaths: string[];
  capability: WriterCapability;
  description?: string;
}

export interface WriteViolation {
  writerId: string;
  attemptedPath: string;
  reason: string;
  timestamp: string;
}
