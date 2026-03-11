export interface AuthoritativeArtifact {
  schemaVersion: string;
  artifactClass: 'authoritative';
  [key: string]: unknown;
}

export interface AdvisoryArtifact {
  schemaVersion: string;
  artifactClass: 'advisory';
  [key: string]: unknown;
}

export interface StreamEntry {
  schema_version: string;
  artifactClass: 'authoritative';
  [key: string]: unknown;
}
