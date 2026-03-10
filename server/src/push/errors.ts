export class PushError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'PushError';
  }
}

export function isPushError(value: unknown): value is PushError {
  return value instanceof PushError;
}
