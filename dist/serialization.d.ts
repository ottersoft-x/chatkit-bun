export type JsonValue = string | number | boolean | null | JsonValue[] | {
    [key: string]: JsonValue;
};
export declare function encodeJsonBytes(value: unknown): Uint8Array;
export declare function decodeJsonBytes(input: string | Uint8Array | ArrayBuffer): unknown;
export declare function omitUndefinedDeep(value: unknown): unknown;
export declare function parseDate(value: string | Date): Date;
export declare function serializeDate(value: string | Date): string;
