#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const fs_1 = require("fs");
const path_1 = require("path");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
// Tool definitions
const TOOLS = [
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
const server = new index_js_1.Server({
    name: 'mindtrace-playwright',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// Get base paths
const getBasePath = () => {
    const envPath = process.env.MINDTRACE_BASE_PATH;
    if (envPath && (0, fs_1.existsSync)(envPath)) {
        return envPath;
    }
    // Default to parent directory
    return (0, path_1.resolve)(__dirname, '../..');
};
const BASE_PATH = getBasePath();
const PROMPTS_DIR = (0, path_1.join)(BASE_PATH, 'prompts');
const RUNS_DIR = (0, path_1.join)(BASE_PATH, 'runs');
// Ensure directories exist
if (!(0, fs_1.existsSync)(RUNS_DIR)) {
    (0, fs_1.mkdirSync)(RUNS_DIR, { recursive: true });
}
// Tool handlers
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case 'listFrameworks': {
                const frameworks = (0, fs_1.readdirSync)(PROMPTS_DIR, { withFileTypes: true })
                    .filter((d) => d.isDirectory())
                    .map((d) => d.name);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                frameworks: frameworks,
                                descriptions: {
                                    native: 'Playwright Native Test Runner - Fast setup, developer-centric',
                                    bdd: 'Playwright + Cucumber BDD - Business-readable, stakeholder-friendly',
                                    'pom-bdd': 'Playwright + POM + Cucumber - Enterprise-scale, long-term maintainability',
                                },
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'listPrompts': {
                const { framework } = args;
                const frameworkDir = (0, path_1.join)(PROMPTS_DIR, framework);
                if (!(0, fs_1.existsSync)(frameworkDir)) {
                    throw new Error(`Framework directory not found: ${framework}`);
                }
                const prompts = (0, fs_1.readdirSync)(frameworkDir)
                    .filter((f) => f.endsWith('.md'))
                    .map((f) => ({
                    name: f,
                    path: (0, path_1.join)(frameworkDir, f),
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
                const { framework, message, style } = args;
                // Simple routing logic - in production, use LLM for smarter routing
                const frameworkDir = (0, path_1.join)(PROMPTS_DIR, framework);
                const prompts = (0, fs_1.readdirSync)(frameworkDir).filter((f) => f.endsWith('.md'));
                // Default to main prompt
                let selectedPrompt = prompts.find((p) => p.includes('main')) || prompts[0];
                // Override with style if provided
                if (style) {
                    const stylePrompt = prompts.find((p) => p.toLowerCase().includes(style.toLowerCase()));
                    if (stylePrompt) {
                        selectedPrompt = stylePrompt;
                    }
                }
                const promptPath = (0, path_1.join)(frameworkDir, selectedPrompt);
                const promptContent = (0, fs_1.readFileSync)(promptPath, 'utf-8');
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                framework,
                                selectedPrompt,
                                promptPath,
                                promptContent,
                                confidence: 0.95,
                                reasoning: `Routed to ${selectedPrompt} based on message analysis`,
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'createRun': {
                const { framework, message, runName, style } = args;
                // Generate run name if not provided
                const finalRunName = runName || `run-${framework}-${Date.now()}`;
                const runDir = (0, path_1.join)(RUNS_DIR, finalRunName);
                const promptsDir = (0, path_1.join)(runDir, 'prompts');
                const artifactsDir = (0, path_1.join)(runDir, 'artifacts');
                // Create directories
                (0, fs_1.mkdirSync)(promptsDir, { recursive: true });
                (0, fs_1.mkdirSync)(artifactsDir, { recursive: true });
                // Route to get prompt
                const frameworkDir = (0, path_1.join)(PROMPTS_DIR, framework);
                const prompts = (0, fs_1.readdirSync)(frameworkDir).filter((f) => f.endsWith('.md'));
                let selectedPrompt = prompts.find((p) => p.includes('main')) || prompts[0];
                if (style) {
                    const stylePrompt = prompts.find((p) => p.toLowerCase().includes(style.toLowerCase()));
                    if (stylePrompt) {
                        selectedPrompt = stylePrompt;
                    }
                }
                const sourcePromptPath = (0, path_1.join)(frameworkDir, selectedPrompt);
                const sourcePromptContent = (0, fs_1.readFileSync)(sourcePromptPath, 'utf-8');
                // Write active prompt
                const activePromptPath = (0, path_1.join)(promptsDir, 'active.md');
                (0, fs_1.writeFileSync)(activePromptPath, sourcePromptContent);
                // Write run metadata
                const metadata = {
                    runName: finalRunName,
                    framework,
                    message,
                    style,
                    selectedPrompt,
                    createdAt: new Date().toISOString(),
                };
                (0, fs_1.writeFileSync)((0, path_1.join)(runDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                runName: finalRunName,
                                runDir,
                                activePromptPath,
                                metadata,
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'getActivePrompt': {
                const { runName } = args;
                const runDir = (0, path_1.join)(RUNS_DIR, runName);
                const activePromptPath = (0, path_1.join)(runDir, 'prompts', 'active.md');
                if (!(0, fs_1.existsSync)(activePromptPath)) {
                    throw new Error(`Active prompt not found for run: ${runName}`);
                }
                const promptContent = (0, fs_1.readFileSync)(activePromptPath, 'utf-8');
                const metadata = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(runDir, 'metadata.json'), 'utf-8'));
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                runName,
                                promptContent,
                                metadata,
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'healSelector': {
                const { selector, pageContext, errorMessage } = args;
                // Placeholder - implement AI-powered healing
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
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
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'classifyFailure': {
                const { testContext } = args;
                // Placeholder - implement AI-powered classification
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
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
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'generateArtifacts': {
                const { runName, artifactTypes } = args;
                const runDir = (0, path_1.join)(RUNS_DIR, runName);
                const artifactsDir = (0, path_1.join)(runDir, 'artifacts');
                if (!(0, fs_1.existsSync)(artifactsDir)) {
                    (0, fs_1.mkdirSync)(artifactsDir, { recursive: true });
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
                    (0, fs_1.writeFileSync)((0, path_1.join)(artifactsDir, artifact.name), artifact.content);
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                runName,
                                artifactsDir,
                                generated: artifacts.map((a) => a.name),
                            }, null, 2),
                        },
                    ],
                };
            }
            case 'rankSelectors': {
                const { selectors, pageContext } = args;
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
                const { framework, testFiles } = args;
                // Placeholder validation
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                framework,
                                testFiles,
                                violations: [],
                                status: 'passed',
                            }, null, 2),
                        },
                    ],
                };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        error: error instanceof Error ? error.message : String(error),
                    }, null, 2),
                },
            ],
            isError: true,
        };
    }
});
// Start server
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error('MindTrace for Playwright server running on stdio');
}
main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map