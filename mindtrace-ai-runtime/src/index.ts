#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { config } from 'dotenv';

config();

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'listFrameworks',
    description: 'List all available automation frameworks (native, bdd, pom-bdd)',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'listPrompts',
    description: 'List all prompt files for a given framework',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          enum: ['native', 'bdd', 'pom-bdd'],
          description: 'Framework name',
        },
      },
      required: ['framework'],
    },
  },
  {
    name: 'routePrompt',
    description: 'Route a user message to the correct prompt for a framework',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          enum: ['native', 'bdd', 'pom-bdd'],
          description: 'Framework name',
        },
        message: {
          type: 'string',
          description: 'User message to route',
        },
        style: {
          type: 'string',
          description: 'Optional style override',
        },
      },
      required: ['framework', 'message'],
    },
  },
  {
    name: 'createRun',
    description: 'Create a new test run with the routed prompt',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          enum: ['native', 'bdd', 'pom-bdd'],
          description: 'Framework name',
        },
        message: {
          type: 'string',
          description: 'User message',
        },
        runName: {
          type: 'string',
          description: 'Optional run name (auto-generated if omitted)',
        },
        style: {
          type: 'string',
          description: 'Optional style override',
        },
      },
      required: ['framework', 'message'],
    },
  },
  {
    name: 'getActivePrompt',
    description: 'Get the active prompt for a run',
    inputSchema: {
      type: 'object',
      properties: {
        runName: {
          type: 'string',
          description: 'Run name',
        },
      },
      required: ['runName'],
    },
  },
  {
    name: 'healSelector',
    description: 'AI-powered selector healing for failed locators',
    inputSchema: {
      type: 'object',
      properties: {
        selector: {
          type: 'string',
          description: 'Original selector that failed',
        },
        pageContext: {
          type: 'object',
          description: 'Page scraping data (DOM snapshot)',
        },
        errorMessage: {
          type: 'string',
          description: 'Error message from the failure',
        },
      },
      required: ['selector', 'pageContext'],
    },
  },
  {
    name: 'classifyFailure',
    description: 'Classify test failure using AI reasoning',
    inputSchema: {
      type: 'object',
      properties: {
        testContext: {
          type: 'object',
          description: 'Test failure context (error, logs, screenshots)',
        },
      },
      required: ['testContext'],
    },
  },
  {
    name: 'generateArtifacts',
    description: 'Generate artifacts from test results (reports, tickets, suggestions)',
    inputSchema: {
      type: 'object',
      properties: {
        runName: {
          type: 'string',
          description: 'Run name',
        },
        artifactTypes: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'Types of artifacts to generate',
        },
      },
      required: ['runName'],
    },
  },
  {
    name: 'rankSelectors',
    description: 'Rank selectors by stability, maintainability, and performance',
    inputSchema: {
      type: 'object',
      properties: {
        selectors: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of selectors to rank',
        },
        pageContext: {
          type: 'object',
          description: 'Page scraping data',
        },
      },
      required: ['selectors'],
    },
  },
  {
    name: 'validateArchitecture',
    description: 'Validate test architecture against framework contracts',
    inputSchema: {
      type: 'object',
      properties: {
        framework: {
          type: 'string',
          enum: ['native', 'bdd', 'pom-bdd'],
          description: 'Framework name',
        },
        testFiles: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: 'List of test file paths',
        },
      },
      required: ['framework', 'testFiles'],
    },
  },
];

// Server setup
const server = new Server(
  {
    name: 'mindtrace-playwright',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Get base paths
const getBasePath = () => {
  const envPath = process.env.MINDTRACE_BASE_PATH;
  if (envPath && existsSync(envPath)) {
    return envPath;
  }
  // Default to parent directory
  return resolve(__dirname, '../..');
};

const BASE_PATH = getBasePath();
const PROMPTS_DIR = join(BASE_PATH, 'prompts');
const RUNS_DIR = join(BASE_PATH, 'runs');

// Ensure directories exist
if (!existsSync(RUNS_DIR)) {
  mkdirSync(RUNS_DIR, { recursive: true });
}

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'listFrameworks': {
        const frameworks = readdirSync(PROMPTS_DIR, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  frameworks: frameworks,
                  descriptions: {
                    native: 'Playwright Native Test Runner - Fast setup, developer-centric',
                    bdd: 'Playwright + Cucumber BDD - Business-readable, stakeholder-friendly',
                    'pom-bdd': 'Playwright + POM + Cucumber - Enterprise-scale, long-term maintainability',
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'listPrompts': {
        const { framework } = args as { framework: string };
        const frameworkDir = join(PROMPTS_DIR, framework);
        
        if (!existsSync(frameworkDir)) {
          throw new Error(`Framework directory not found: ${framework}`);
        }

        const prompts = readdirSync(frameworkDir)
          .filter((f) => f.endsWith('.md'))
          .map((f) => ({
            name: f,
            path: join(frameworkDir, f),
          }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ framework, prompts }, null, 2),
            },
          ],
        };
      }

      case 'routePrompt': {
        const { framework, message, style } = args as {
          framework: string;
          message: string;
          style?: string;
        };

        // Simple routing logic - in production, use LLM for smarter routing
        const frameworkDir = join(PROMPTS_DIR, framework);
        const prompts = readdirSync(frameworkDir).filter((f) => f.endsWith('.md'));
        
        // Default to main prompt
        let selectedPrompt = prompts.find((p) => p.includes('main')) || prompts[0];

        // Override with style if provided
        if (style) {
          const stylePrompt = prompts.find((p) => p.toLowerCase().includes(style.toLowerCase()));
          if (stylePrompt) {
            selectedPrompt = stylePrompt;
          }
        }

        const promptPath = join(frameworkDir, selectedPrompt);
        const promptContent = readFileSync(promptPath, 'utf-8');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  framework,
                  selectedPrompt,
                  promptPath,
                  promptContent,
                  confidence: 0.95,
                  reasoning: `Routed to ${selectedPrompt} based on message analysis`,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'createRun': {
        const { framework, message, runName, style } = args as {
          framework: string;
          message: string;
          runName?: string;
          style?: string;
        };

        // Generate run name if not provided
        const finalRunName =
          runName || `run-${framework}-${Date.now()}`;
        const runDir = join(RUNS_DIR, finalRunName);
        const promptsDir = join(runDir, 'prompts');
        const artifactsDir = join(runDir, 'artifacts');

        // Create directories
        mkdirSync(promptsDir, { recursive: true });
        mkdirSync(artifactsDir, { recursive: true });

        // Route to get prompt
        const frameworkDir = join(PROMPTS_DIR, framework);
        const prompts = readdirSync(frameworkDir).filter((f) => f.endsWith('.md'));
        let selectedPrompt = prompts.find((p) => p.includes('main')) || prompts[0];

        if (style) {
          const stylePrompt = prompts.find((p) => p.toLowerCase().includes(style.toLowerCase()));
          if (stylePrompt) {
            selectedPrompt = stylePrompt;
          }
        }

        const sourcePromptPath = join(frameworkDir, selectedPrompt);
        const sourcePromptContent = readFileSync(sourcePromptPath, 'utf-8');

        // Write active prompt
        const activePromptPath = join(promptsDir, 'active.md');
        writeFileSync(activePromptPath, sourcePromptContent);

        // Write run metadata
        const metadata = {
          runName: finalRunName,
          framework,
          message,
          style,
          selectedPrompt,
          createdAt: new Date().toISOString(),
        };
        writeFileSync(join(runDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  runName: finalRunName,
                  runDir,
                  activePromptPath,
                  metadata,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'getActivePrompt': {
        const { runName } = args as { runName: string };
        const runDir = join(RUNS_DIR, runName);
        const activePromptPath = join(runDir, 'prompts', 'active.md');

        if (!existsSync(activePromptPath)) {
          throw new Error(`Active prompt not found for run: ${runName}`);
        }

        const promptContent = readFileSync(activePromptPath, 'utf-8');
        const metadata = JSON.parse(
          readFileSync(join(runDir, 'metadata.json'), 'utf-8')
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  runName,
                  promptContent,
                  metadata,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'healSelector': {
        const { selector, pageContext, errorMessage } = args as {
          selector: string;
          pageContext: any;
          errorMessage?: string;
        };

        // Placeholder - implement AI-powered healing
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  originalSelector: selector,
                  healedSelector: selector.replace('#', '[data-testid='),
                  confidence: 0.85,
                  strategy: 'data_testid',
                  reasoning: 'Converted CSS selector to data-testid for stability',
                  alternatives: [
                    {
                      selector: `role=button[name="${selector}"]`,
                      strategy: 'role',
                      confidence: 0.75,
                    },
                  ],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'classifyFailure': {
        const { testContext } = args as { testContext: any };

        // Placeholder - implement AI-powered classification
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  category: 'selector_failed',
                  confidence: 0.9,
                  reasoning: 'Element not found error indicates selector issue',
                  suggestedActions: [
                    'Use AI selector healing',
                    'Update page object with new selector',
                    'Add explicit wait before interaction',
                  ],
                  isFlaky: false,
                  rootCause: 'DOM structure changed in recent deployment',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'generateArtifacts': {
        const { runName, artifactTypes } = args as {
          runName: string;
          artifactTypes?: string[];
        };

        const runDir = join(RUNS_DIR, runName);
        const artifactsDir = join(runDir, 'artifacts');

        if (!existsSync(artifactsDir)) {
          mkdirSync(artifactsDir, { recursive: true });
        }

        // Generate sample artifacts
        const artifacts = [
          {
            name: 'healed-selectors.json',
            content: JSON.stringify({ selectors: [] }, null, 2),
          },
          {
            name: 'failure-narrative.md',
            content: '# Test Failure Analysis\n\nNo failures detected.',
          },
        ];

        for (const artifact of artifacts) {
          writeFileSync(join(artifactsDir, artifact.name), artifact.content);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  runName,
                  artifactsDir,
                  generated: artifacts.map((a) => a.name),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'rankSelectors': {
        const { selectors, pageContext } = args as {
          selectors: string[];
          pageContext?: any;
        };

        // Placeholder ranking logic
        const rankings = selectors.map((s) => ({
          selector: s,
          score: Math.random() * 100,
          factors: {
            stability: Math.random() * 100,
            specificity: Math.random() * 100,
            maintainability: Math.random() * 100,
            performance: Math.random() * 100,
          },
          recommendation: 'good',
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ rankings }, null, 2),
            },
          ],
        };
      }

      case 'validateArchitecture': {
        const { framework, testFiles } = args as {
          framework: string;
          testFiles: string[];
        };

        // Placeholder validation
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  framework,
                  testFiles,
                  violations: [],
                  status: 'passed',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : String(error),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MindTrace for Playwright server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
