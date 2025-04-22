import { RequestError, RequestErrorExtractor } from './types.ts';
import { isAxiosError, isRecord } from './utils.ts';

export class LoadingStoreError extends Error {}

export class LoadingStoreRequestError<RequestType> extends LoadingStoreError {
  type: RequestType;

  error: RequestError;

  constructor(message: string, type: RequestType, error: RequestError) {
    super(message);
    this.type = type;
    this.error = error;
  }
}

export class LoadingStoreRequestWaitTimeoutError<RequestType> extends LoadingStoreError {
  type: RequestType;

  constructor(message: string, type: RequestType) {
    super(message);
    this.type = type;
  }
}

export function isLoadingStoreRequestError<RequestType>(e: unknown): e is LoadingStoreRequestError<RequestType> {
  return (
    isRecord(e) && e.type !== undefined && isRecord(e.error) && typeof e.error.code === 'number' && !!e.error.instance
  );
}

export const defaultRequestErrorExtractor: RequestErrorExtractor = (e: unknown): RequestError | undefined => {
  if (isAxiosError(e) && e.response) {
    const { data, status } = e.response;
    return { instance: data, code: status };
  }
  return undefined;
};
