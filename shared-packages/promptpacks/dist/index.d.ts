export type PromptInfo = {
    name: string;
    path: string;
};
export declare function listFrameworks(promptRoot: string): string[];
export declare function listPrompts(promptRoot: string, framework: string): PromptInfo[];
export declare function getPromptText(promptRoot: string, framework: string, filename: string): string;
//# sourceMappingURL=index.d.ts.map