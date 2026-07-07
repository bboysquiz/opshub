export class SpacesError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'SpacesError';
    this.status = status;
  }
}

export function isSpacesError(err: unknown): err is SpacesError {
  return err instanceof SpacesError;
}
