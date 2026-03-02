import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { canonicalStringify } from "../core/deterministic.js";
import type { AutomationContract, PageKeyPolicy, ContractMeta } from "../types/contract.js";

export async function writeContractBundle(params: {
  contractDir: string;
  automationContract: AutomationContract;
  pageKeyPolicy: PageKeyPolicy;
  contractMeta: ContractMeta;
}): Promise<void> {
  const tempDir = path.join(params.contractDir, ".tmp", crypto.randomUUID());

  await fs.mkdir(params.contractDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });

  const files = [
    { name: "automation-contract.json", data: params.automationContract },
    { name: "page-key-policy.json", data: params.pageKeyPolicy },
    { name: "contract.meta.json", data: params.contractMeta }
  ];

  // Write all to temp directory
  for (const file of files) {
    await fs.writeFile(path.join(tempDir, file.name), canonicalStringify(file.data), "utf-8");
  }

  // Copy to final destination in sorted order
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    await fs.copyFile(path.join(tempDir, file.name), path.join(params.contractDir, file.name));
  }

  // Cleanup temp directory
  await fs.rm(tempDir, { recursive: true, force: true });
}
