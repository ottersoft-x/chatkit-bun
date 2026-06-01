export declare class ChatKitError extends Error {
    constructor(message: string);
}
export declare class NotFoundError extends ChatKitError {
}
export declare class UnsupportedOperationError extends ChatKitError {
}
export declare class ValidationError extends ChatKitError {
    readonly cause?: unknown | undefined;
    constructor(message: string, cause?: unknown | undefined);
}
