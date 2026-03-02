export type Signal = {
  id: string; // stable hash of (type|path|evidence.kind|evidence.value)
  type: string;
  path: string; // repo-relative, POSIX-style
  lineStart?: number;
  lineEnd?: number;
  evidence: {
    kind: string; // filename|json-key|import|regex-hit|path
    value: string; // short, sanitized (no secrets)
  };
  confidence: number; // 0..1
  tags: string[];
};

export type RepoTopologyJSON = {
  toolVersion: string; // "0.1.0"
  scannedAt: string; // ISO-8601
  repoRoot: string; // absolute resolved path
  files: {
    count: number;
    paths: string[]; // stable-sorted repo-relative
  };
  directories: string[]; // stable-sorted repo-relative
  packageManagers: {
    node: {
      packageJson: string | null;
      lockfiles: string[];
    };
    python: {
      pyprojectToml: string | null;
      poetryLock: string | null;
      requirementsTxt: string[];
    };
  };
  languageStats: Record<string, number>;
  configFiles: string[]; // stable-sorted
  testSurface: {
    candidateTestDirs: string[];
    candidateSupportDirs: string[];
  };
  signals: Signal[]; // stable-sorted by id
  warnings: string[];
};

export type ScanRepoInput = {
  rootPath: string;
  ignore?: {
    dirs?: string[];
    globs?: string[];
  };
  limits?: {
    maxFiles?: number;
    maxFileBytes?: number;
    maxSampleFilesPerCategory?: number;
  };
};
