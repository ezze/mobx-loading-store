export interface Store {
  initialized: boolean;
  initializing: boolean;
  disposed: boolean;
  disposing: boolean;

  init(): Promise<void>;
  dispose(): Promise<void>;
  whenInitialized(): Promise<void>;
  whenDisposed(): Promise<void>;
}

export type RecordEntryKey = string | number;

export type RequestAction<Response> = () => Promise<Response>;

export type RequestError = {
  instance: unknown;
  code: number;
};

export type RequestOptions<Response> = {
  waitTimeout?: number;
  onSuccess?: (response: Response) => void;
  onError?: (e: RequestError) => void;
};

export type RequestStatus = {
  loading: boolean;
  requested: boolean;
  loaded: boolean;
  loadedOnce: boolean;
  error: boolean;
  errorOnce: boolean;
};

export type RequestErrorExtractor = (e: unknown) => RequestError | undefined;

export type LoadingStoreOptions = {
  requestErrorExtractor?: RequestErrorExtractor;
};

// Axios related types
export interface AxiosResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: unknown;
  config: unknown;
  request?: unknown; // The request object (e.g., XMLHttpRequest or Node.js HTTP request)
}

export interface AxiosError<T = unknown> extends Error {
  config: unknown;
  code?: string | null;
  request?: unknown;
  response?: AxiosResponse<T>;
  isAxiosError: true;
  toJSON: () => object;
}
