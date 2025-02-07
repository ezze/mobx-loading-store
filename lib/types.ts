export interface Store {
  init(): Promise<void>;
  dispose(): Promise<void>;
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
  error: boolean;
  requested: boolean;
  loaded: boolean;
};

export type RequestErrorExtractor = (e: unknown) => RequestError;

export type LoadingStoreOptions = {
  requestErrorExtractor?: RequestErrorExtractor;
};
