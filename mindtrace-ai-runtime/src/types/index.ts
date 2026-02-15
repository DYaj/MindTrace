// Core types for MindTrace for Playwright Framework

export interface MCPConfig {
  llmProvider: 'openai' | 'anthropic' | 'ollama';
  llmModel?: string;
  llmApiKey?: string;
  llmBaseUrl?: string;
  healingEnabled: boolean;
  failureClassificationEnabled: boolean;
  artifactGenerationEnabled: boolean;
  selectorRankingStrategy: 'stability' | 'speed' | 'balanced';
  retryStrategy: 'immediate' | 'exponential' | 'linear';
  maxRetries: number;
}

export interface FrameworkStyle {
  name: 'native' | 'bdd' | 'pom-bdd';
  description: string;
  templatePath: string;
  features: string[];
}

export interface FailureContext {
  testName: string;
  testFile: string;
  errorMessage: string;
  errorStack?: string;
  screenshot?: string;
  htmlSnapshot?: string;
  networkLogs?: NetworkLog[];
  consoleLogs?: ConsoleLog[];
  timestamp: string;
  duration: number;
  retryCount: number;
}

export interface NetworkLog {
  url: string;
  method: string;
  status: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp: string;
  duration: number;
}

export interface ConsoleLog {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: string;
  location?: string;
}

export interface FailureClassification {
  category: FailureCategory;
  confidence: number;
  reasoning: string;
  suggestedActions: string[];
  isFlaky: boolean;
  rootCause: string;
  affectedComponent?: string;
}

export type FailureCategory =
  | 'dom_changed'
  | 'selector_failed'
  | 'api_error'
  | 'timeout'
  | 'navigation_mismatch'
  | 'ux_regression'
  | 'unexpected_modal'
  | 'environmental'
  | 'test_logic_error'
  | 'unknown';

export interface SelectorHealing {
  originalSelector: string;
  healedSelector: string;
  confidence: number;
  strategy: SelectorStrategy;
  reasoning: string;
  alternatives: AlternativeSelector[];
}

export type SelectorStrategy =
  | 'data_testid'
  | 'role'
  | 'text'
  | 'placeholder'
  | 'label'
  | 'css'
  | 'xpath';

export interface AlternativeSelector {
  selector: string;
  strategy: SelectorStrategy;
  confidence: number;
  pros: string[];
  cons: string[];
}

export interface PageScrapingData {
  url: string;
  timestamp: string;
  elements: ScrapedElement[];
  metadata: {
    title: string;
    viewport: { width: number; height: number };
    userAgent: string;
  };
}

export interface ScrapedElement {
  id?: string;
  tagName: string;
  attributes: Record<string, string>;
  textContent?: string;
  xpath: string;
  cssPath: string;
  role?: string;
  ariaLabel?: string;
  dataTestId?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  children: ScrapedElement[];
}

export interface Artifact {
  type: ArtifactType;
  name: string;
  content: string;
  format: 'json' | 'markdown' | 'text' | 'html';
  metadata: Record<string, any>;
  timestamp: string;
}

export type ArtifactType =
  | 'healed_selectors'
  | 'test_snippet'
  | 'failure_narrative'
  | 'root_cause_summary'
  | 'automation_suggestion'
  | 'jira_ticket'
  | 'steps_to_reproduce'
  | 'execution_trace'
  | 'coverage_gap_report';

export interface TestRun {
  runId: string;
  runName: string;
  framework: FrameworkStyle['name'];
  startTime: string;
  endTime?: string;
  status: 'running' | 'passed' | 'failed' | 'skipped';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  failures: FailureContext[];
  healings: SelectorHealing[];
  artifacts: Artifact[];
}

export interface PromptRoutingResult {
  framework: FrameworkStyle['name'];
  promptPath: string;
  confidence: number;
  reasoning: string;
}

export interface LLMRequest {
  prompt: string;
  context: Record<string, any>;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface SelectorRanking {
  selector: string;
  score: number;
  factors: {
    stability: number;
    specificity: number;
    maintainability: number;
    performance: number;
  };
  recommendation: 'excellent' | 'good' | 'acceptable' | 'poor';
}

export interface HealingPolicy {
  enabled: boolean;
  autoApply: boolean;
  confidenceThreshold: number;
  maxAttempts: number;
  strategies: SelectorStrategy[];
  fallbackBehavior: 'fail' | 'skip' | 'manual';
}

export interface ArchitectureContract {
  framework: FrameworkStyle['name'];
  rules: ArchitectureRule[];
  violations: ContractViolation[];
}

export interface ArchitectureRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  check: (testFile: string) => boolean;
}

export interface ContractViolation {
  ruleId: string;
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface CIConfig {
  provider: 'teamcity' | 'jenkins' | 'github-actions' | 'gitlab-ci';
  publishArtifacts: boolean;
  commentOnPR: boolean;
  slackNotifications: boolean;
  jiraIntegration: boolean;
  dashboardUrl?: string;
}
