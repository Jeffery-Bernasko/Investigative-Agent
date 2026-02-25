export type SafeErrorInfo = {
    name: string;
    message: string;
    stack?: string;
};

export function getSafeErrorInfo(error: unknown): SafeErrorInfo {
    try {
        if (error instanceof Error) {
            return {
                name: error.name || "Error",
                message: error.message || "Unknown error",
                stack: error.stack,
            };
        }

        if (typeof error === "string") {
            return {
                name: "Error",
                message: error,
            };
        }

        return {
            name: "UnknownError",
            message: "A non-Error value was thrown",
        };
    } catch {
        return {
            name: "UnknownError",
            message: "Failed to parse thrown error safely",
        };
    }
}
