import type { Annotation } from "../types/core";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nonEmptyStringValue(value: unknown): string | null {
  const text = stringValue(value);
  return text && text.length > 0 ? text : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

export interface ResponseStreamConverterOptions {
  partialImages?: number | null;
}

export class ResponseStreamConverter {
  private readonly partialImages: number | null;

  constructor(options: ResponseStreamConverterOptions = {}) {
    this.partialImages = options.partialImages ?? null;
  }

  base64ImageToUrl(
    _imageId: string,
    base64Image: string,
    _partialImageIndex: number | null = null,
  ): string | Promise<string> {
    return Promise.resolve(`data:image/png;base64,${base64Image}`);
  }

  partialImageIndexToProgress(partialImageIndex: number): number {
    if (this.partialImages === null || this.partialImages <= 0) {
      return 0;
    }

    return Math.min(1, partialImageIndex / this.partialImages);
  }

  convertAnnotation(annotation: unknown): Annotation | null {
    if (!isRecord(annotation)) {
      return null;
    }

    switch (annotation.type) {
      case "file_citation":
        return this.fileCitationToAnnotation(annotation);
      case "container_file_citation":
        return this.containerFileCitationToAnnotation(annotation);
      case "url_citation":
        return this.urlCitationToAnnotation(annotation);
      default:
        return null;
    }
  }

  fileCitationToAnnotation(annotation: unknown): Annotation | null {
    if (!isRecord(annotation)) {
      return null;
    }

    const filename = nonEmptyStringValue(annotation.filename);
    if (!filename) {
      return null;
    }

    return {
      type: "annotation",
      source: { type: "file", filename, title: filename },
      index: numberValue(annotation.index),
    };
  }

  containerFileCitationToAnnotation(annotation: unknown): Annotation | null {
    if (!isRecord(annotation)) {
      return null;
    }

    const filename = nonEmptyStringValue(annotation.filename);
    if (!filename) {
      return null;
    }

    return {
      type: "annotation",
      source: { type: "file", filename, title: filename },
      index: numberValue(annotation.end_index),
    };
  }

  urlCitationToAnnotation(annotation: unknown): Annotation | null {
    if (!isRecord(annotation)) {
      return null;
    }

    const url = nonEmptyStringValue(annotation.url);
    const title = nonEmptyStringValue(annotation.title);
    if (!url || !title) {
      return null;
    }

    return {
      type: "annotation",
      source: { type: "url", url, title },
      index: numberValue(annotation.end_index),
    };
  }
}

export interface ConvertedTextContent {
  type: "output_text";
  text: string;
  annotations: Annotation[];
}

export function convertTextContentPart(
  part: unknown,
  converter: ResponseStreamConverter,
): ConvertedTextContent | null {
  if (!isRecord(part)) {
    return null;
  }

  if (part.type === "refusal") {
    const text = stringValue(part.refusal);
    return text === null ? null : { type: "output_text", text, annotations: [] };
  }

  if (part.type !== "output_text") {
    return null;
  }

  const text = stringValue(part.text);
  if (text === null) {
    return null;
  }

  const annotations = Array.isArray(part.annotations)
    ? part.annotations.flatMap((annotation) => {
        const converted = converter.convertAnnotation(annotation);
        return converted ? [converted] : [];
      })
    : [];

  return { type: "output_text", text, annotations };
}

export const defaultResponseStreamConverter = new ResponseStreamConverter();
