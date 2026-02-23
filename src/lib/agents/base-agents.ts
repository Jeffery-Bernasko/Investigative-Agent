import { OllamaClient } from "@/lib/ai/ollama-adapter";
import { Task, AgentResult } from "./types";

export interface AgentConfig {
    name: string;
    llm: OllamaClient;
    db: any; // DrizzleDB type
}

export abstract class BaseAgent {
    protected name: string;
    protected llm: OllamaClient;
    protected db: any;

    constructor(config: AgentConfig) {
        this.name = config.name;
        this.llm = config.llm;
        this.db = config.db;
    }

    // Main execution method - must be implemented by child agents
    abstract execute(task: Task): Promise<AgentResult>;

    // Helper: AI-powered decision making
    protected async think(prompt: string): Promise<string> {
        try {
            const response = await this.llm.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are ${this.name}, an autonomous agent specializing in OSINT investigations.`,
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.3, // Lower temperature for more focused responses
            });

            return response.choices[0].message.content || "";
        } catch (error) {
            console.error(`${this.name} thinking error:`, error);
            throw error;
        }
    }

    // Helper: Log agent actions
    protected log(message: string) {
        console.log(`[${this.name}] ${message}`);
    }
}