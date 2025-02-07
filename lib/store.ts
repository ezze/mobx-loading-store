import { action, computed, makeObservable, observable, when } from 'mobx';
import { computedFn } from 'mobx-utils';

import { LoadingStoreRequestError, LoadingStoreRequestWaitTimeoutError } from './error.ts';
import {
  LoadingStoreOptions,
  RequestAction,
  RequestError,
  RequestErrorExtractor,
  RequestOptions,
  RequestStatus,
  Store
} from './types';
import { getRecordEntries, isAxiosError } from './utils';

const defaultRequestErrorExtractor: RequestErrorExtractor = (e: unknown): RequestError | undefined => {
  if (isAxiosError(e) && e.response) {
    const { data, status } = e.response;
    return { instance: data, code: status };
  }
  return undefined;
};

const defaultRequestWaitTimeout = 30000;

export abstract class LoadingStore<RequestType extends string | number = string> implements Store {
  requestErrorExtractor: RequestErrorExtractor;

  @observable accessor initialized = false;

  @observable accessor loadingMap: Partial<Record<RequestType, boolean>> = {};

  @observable accessor errorMap: Partial<Record<RequestType, RequestError>> = {};

  @observable accessor requestedMap: Partial<Record<RequestType, boolean>> = {}; // shows whether data was requested at least once

  public constructor(options?: LoadingStoreOptions) {
    const { requestErrorExtractor } = options || {};
    this.requestErrorExtractor = requestErrorExtractor || defaultRequestErrorExtractor;
    makeObservable(this);
  }

  init(): Promise<void> {
    this.initialized = true;
    return Promise.resolve();
  }

  async whenInitialized(): Promise<void> {
    return when(() => this.initialized);
  }

  async dispose() {
    // Nothing to do here at the moment
  }

  @action resetRequestStatus(requestTypes: RequestType | Array<RequestType> = []): void {
    const reqTypes = Array.isArray(requestTypes) ? requestTypes : [requestTypes];
    if (reqTypes.length === 0) {
      this.loadingMap = {};
      this.errorMap = {};
      this.requestedMap = {};
    } else {
      reqTypes.forEach((requestType) => {
        if (this.loadingMap[requestType]) {
          delete this.loadingMap[requestType];
        }
        if (this.errorMap[requestType]) {
          delete this.errorMap[requestType];
        }
        if (this.requestedMap[requestType]) {
          delete this.requestedMap[requestType];
        }
      });
    }
  }

  @action setLoading(requestType: RequestType, loading: boolean): void {
    this.loadingMap[requestType] = loading;
  }

  @action setError(requestType: RequestType, error?: RequestError): void {
    if (error === undefined) {
      delete this.errorMap[requestType];
    } else {
      this.errorMap[requestType] = error;
    }
  }

  @action setRequested(requestType: RequestType, requested: boolean): void {
    this.requestedMap[requestType] = requested;
  }

  loading = computedFn((requestType: RequestType): boolean => {
    return this.loadingMap[requestType] === true;
  });

  @computed get anyLoading(): boolean {
    return Object.values(this.loadingMap).includes(true);
  }

  anyOfLoading = computedFn((requestTypes: Array<RequestType>): boolean => {
    return requestTypes.some((requestType) => this.loadingMap[requestType] === true);
  });

  error = computedFn((requestType: RequestType): boolean => {
    return !!this.errorMap[requestType];
  });

  errorInstance = computedFn((requestType: RequestType): unknown | undefined => {
    return this.errorMap[requestType]?.instance;
  });

  errorCode = computedFn((requestType: RequestType): number | undefined => {
    return this.errorMap[requestType]?.code;
  });

  @computed get anyError(): boolean {
    return !!Object.values(this.errorMap).find((error) => !!error);
  }

  anyOfError = computedFn((requestTypes: Array<RequestType>): boolean => {
    return requestTypes.some((requestType) => !!this.errorMap[requestType]);
  });

  requested = computedFn((requestType: RequestType): boolean => {
    return this.requestedMap[requestType] === true;
  });

  @computed get anyRequested(): boolean {
    return Object.values(this.requestedMap).includes(true);
  }

  anyOfRequested = computedFn((requestTypes: Array<RequestType>): boolean => {
    return requestTypes.some((requestType) => this.requestedMap[requestType] === true);
  });

  loaded = computedFn((requestType: RequestType): boolean => {
    const loading = this.loading(requestType);
    const error = this.error(requestType);
    const requested = this.requested(requestType);
    return requested && !loading && !error;
  });

  @computed get anyLoaded(): boolean {
    return getRecordEntries<RequestType, boolean>(this.requestedMap).some(([requestType, requested]) => {
      return requested && !this.loading(requestType) && !this.error(requestType);
    });
  }

  anyOfLoaded = computedFn((requestTypes: Array<RequestType>): boolean => {
    return this.anyOfRequested(requestTypes) && !this.anyOfLoading(requestTypes) && !this.anyOfError(requestTypes);
  });

  requestStatus = computedFn((requestType: RequestType): RequestStatus => {
    const loading = this.loading(requestType);
    const error = this.error(requestType);
    const requested = this.requested(requestType);
    const loaded = this.loaded(requestType);
    return { loading, error, requested, loaded };
  });

  @computed get requestAnyStatus(): RequestStatus {
    return {
      loading: this.anyLoading,
      error: this.anyError,
      requested: this.anyRequested,
      loaded: this.anyLoaded
    };
  }

  requestAnyOfStatus = computedFn((requestTypes: Array<RequestType>): RequestStatus => {
    return {
      loading: this.anyOfLoading(requestTypes),
      error: this.anyOfError(requestTypes),
      requested: this.anyOfRequested(requestTypes),
      loaded: this.anyOfLoaded(requestTypes)
    };
  });

  async waitForRequest(requestType: RequestType, timeout = defaultRequestWaitTimeout): Promise<boolean> {
    try {
      await when(() => !this.loading(requestType), { timeout });
      return true;
    } catch (_) {
      return false;
    }
  }

  @action async request<Response>(
    requestType: RequestType,
    action: RequestAction<Response>,
    options?: RequestOptions<Response>
  ): Promise<Response> {
    const { waitTimeout, onSuccess, onError } = options || {};
    const proceed = await this.waitForRequest(requestType, waitTimeout);
    if (!proceed) {
      throw new LoadingStoreRequestWaitTimeoutError(`Request "${requestType}" is timed out`, requestType);
    }
    try {
      this.setLoading(requestType, true);
      const response = await action();
      this.onRequestSuccess(requestType, response, onSuccess);
      return response;
    } catch (e) {
      const error = this.requestErrorExtractor(e) || { instance: e, code: -1 };
      this.onRequestError(requestType, error, onError);
      throw new LoadingStoreRequestError(`Request "${requestType}" failed`, requestType, error);
    }
  }

  @action async requestUndefined<Response>(
    requestType: RequestType,
    action: RequestAction<Response>,
    options?: RequestOptions<Response>
  ): Promise<Response | undefined> {
    const { waitTimeout, onSuccess, onError } = options || {};
    const proceed = await this.waitForRequest(requestType, waitTimeout);
    if (!proceed) {
      throw new LoadingStoreRequestWaitTimeoutError(`Request "${requestType}" is timed out`, requestType);
    }
    try {
      this.setLoading(requestType, true);
      const response = await action();
      this.onRequestSuccess(requestType, response, onSuccess);
      return response;
    } catch (e) {
      const error = this.requestErrorExtractor(e) || { instance: e, code: -1 };
      this.onRequestError(requestType, error, onError);
      return undefined;
    }
  }

  @action onRequestSuccess<Response>(
    requestType: RequestType,
    response: Response,
    onSuccess?: (response: Response) => void
  ): void {
    this.setRequested(requestType, true);
    this.setLoading(requestType, false);
    this.setError(requestType, undefined);
    if (onSuccess) {
      onSuccess(response);
    }
  }

  @action onRequestError(requestType: RequestType, error: RequestError, onError?: (e: RequestError) => void): void {
    this.setRequested(requestType, true);
    this.setLoading(requestType, false);
    this.setError(requestType, error);
    if (onError) {
      onError(error);
    }
  }
}
