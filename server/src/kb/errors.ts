export class KbError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'KbError';
    this.status = status;
  }
}

export function isKbError(err: unknown): err is KbError {
  return err instanceof KbError;
}
