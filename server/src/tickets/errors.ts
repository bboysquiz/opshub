export class TicketsError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'TicketsError';
    this.status = status;
  }
}

export function isTicketsError(err: unknown): err is TicketsError {
  return err instanceof TicketsError;
}
