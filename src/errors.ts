export class ChatKitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends ChatKitError {}

export class UnsupportedOperationError extends ChatKitError {}

export class ValidationError extends ChatKitError {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
  }
}
