import type { Annotation } from "../types/core";
export interface ResponseStreamConverterOptions {
    partialImages?: number | null;
}
export declare class ResponseStreamConverter {
    private readonly partialImages;
    constructor(options?: ResponseStreamConverterOptions);
    base64ImageToUrl(_imageId: string, base64Image: string, _partialImageIndex?: number | null): string | Promise<string>;
    partialImageIndexToProgress(partialImageIndex: number): number;
    convertAnnotation(annotation: unknown): Annotation | null;
    fileCitationToAnnotation(annotation: unknown): Annotation | null;
    containerFileCitationToAnnotation(annotation: unknown): Annotation | null;
    urlCitationToAnnotation(annotation: unknown): Annotation | null;
}
export interface ConvertedTextContent {
    type: "output_text";
    text: string;
    annotations: Annotation[];
}
export declare function convertTextContentPart(part: unknown, converter: ResponseStreamConverter): ConvertedTextContent | null;
export declare const defaultResponseStreamConverter: ResponseStreamConverter;
