import { RequestError } from './types.ts';
import { isRecord } from './utils.ts';

export class LoadingStoreError extends Error {}

export class LoadingStoreRequestWaitTimeoutError<RequestType> extends LoadingStoreError {
  type: RequestType;

  constructor(message: string, type: RequestType) {
    super(message);
    this.type = type;
  }
}

export class LoadingStoreRequestError<RequestType> extends LoadingStoreError {
  type: RequestType;

  error: RequestError;

  constructor(message: string, type: RequestType, error: RequestError) {
    super(message);
    this.type = type;
    this.error = error;
  }
}

export function isLoadingStoreRequestError<RequestType>(e: unknown): e is LoadingStoreRequestError<RequestType> {
  return (
    isRecord(e) && e.type !== undefined && isRecord(e.error) && typeof e.error.code === 'number' && !!e.error.instance
  );
}
