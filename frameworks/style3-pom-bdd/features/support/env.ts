import dotenv from "dotenv";
import path from "path";

// features/support -> features -> style3-pom-bdd -> frameworks -> repo root
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

export const BASE_URL = (process.env.BASE_URL || "http://localhost:3000").trim();
