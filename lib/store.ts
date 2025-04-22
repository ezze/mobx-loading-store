import { action, computed, observable, when } from 'mobx';
import { computedFn } from 'mobx-utils';

import { DEFAULT_REQUEST_WAIT_TIMEOUT } from './const.ts';
import {
  defaultRequestErrorExtractor,
  LoadingStoreRequestError,
  LoadingStoreRequestWaitTimeoutError
} from './error.ts';
import {
  LoadingStoreOptions,
  RequestAction,
  RequestError,
  RequestErrorExtractor,
  RequestOptions,
  RequestStatus,
  Store
} from './types';
import { getRecordEntries } from './utils';

export abstract class LoadingStore<RequestType extends string | number = string> implements Store {
  requestErrorExtractor: RequestErrorExtractor;

  @observable accessor initialized = false;

  @observable accessor requestedMap: Partial<Record<RequestType, boolean>> = {}; // shows whether data was requested at least once

  @observable accessor loadingMap: Partial<Record<RequestType, boolean>> = {};

  @observable accessor loadedOnceMap: Partial<Record<RequestType, boolean>> = {}; // shows whether data was loaded at least once

  @observable accessor errorMap: Partial<Record<RequestType, RequestError>> = {};

  @observable accessor errorOnceMap: Partial<Record<RequestType, boolean>> = {}; // show whether data was failed to load at least once

  public constructor(options?: LoadingStoreOptions) {
    const { requestErrorExtractor } = options || {};
    this.requestErrorExtractor = requestErrorExtractor || defaultRequestErrorExtractor;
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
      this.requestedMap = {};
      this.loadingMap = {};
      this.loadedOnceMap = {};
      this.errorMap = {};
      this.errorOnceMap = {};
    } else {
      reqTypes.forEach((requestType) => {
        if (this.requestedMap[requestType]) {
          delete this.requestedMap[requestType];
        }
        if (this.loadingMap[requestType]) {
          delete this.loadingMap[requestType];
        }
        if (this.loadedOnceMap[requestType]) {
          delete this.loadedOnceMap[requestType];
        }
        if (this.errorMap[requestType]) {
          delete this.errorMap[requestType];
        }
        if (this.errorOnceMap[requestType]) {
          delete this.errorOnceMap[requestType];
        }
      });
    }
  }

  // Internal actions to alter request status

  @action protected setRequested(requestType: RequestType, requested: boolean): void {
    this.requestedMap[requestType] = requested;
  }

  @action protected setLoading(requestType: RequestType, loading: boolean): void {
    this.loadingMap[requestType] = loading;
  }

  @action protected setLoadedOnce(requestType: RequestType, loadedOnce: boolean): void {
    this.loadedOnceMap[requestType] = loadedOnce;
  }

  @action protected setError(requestType: RequestType, error?: RequestError): void {
    if (error === undefined) {
      delete this.errorMap[requestType];
    } else {
      this.errorMap[requestType] = error;
    }
  }

  @action protected setErrorOnce(requestType: RequestType, errorOnce: boolean): void {
    this.errorOnceMap[requestType] = errorOnce;
  }

  // Request status computed properties and functions:

  // Requested
  requested = computedFn((requestType: RequestType): boolean => {
    return this.requestedMap[requestType] === true;
  });

  @computed get anyRequested(): boolean {
    return Object.values(this.requestedMap).includes(true);
  }

  anyOfRequested = computedFn((requestTypes: Array<RequestType>): boolean => {
    return requestTypes.some((requestType) => this.requestedMap[requestType] === true);
  });

  // Loading
  loading = computedFn((requestType: RequestType): boolean => {
    return this.loadingMap[requestType] === true;
  });

  @computed get anyLoading(): boolean {
    return Object.values(this.loadingMap).includes(true);
  }

  anyOfLoading = computedFn((requestTypes: Array<RequestType>): boolean => {
    return requestTypes.some((requestType) => this.loadingMap[requestType] === true);
  });

  // Loaded
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

  // Loaded once
  loadedOnce = computedFn((requestType: RequestType): boolean => {
    return this.loadedOnceMap[requestType] === true;
  });

  @computed get anyLoadedOnce(): boolean {
    return Object.values(this.loadedOnceMap).includes(true);
  }

  anyOfLoadedOnce = computedFn((requestTypes: Array<RequestType>): boolean => {
    return requestTypes.some((requestType) => this.loadedOnceMap[requestType] === true);
  });

  // Error
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

  // Error once
  errorOnce = computedFn((requestType: RequestType): boolean => {
    return this.errorOnceMap[requestType] === true;
  });

  @computed get anyErrorOnce(): boolean {
    return Object.values(this.errorOnceMap).includes(true);
  }

  anyOfErrorOnce = computedFn((requestTypes: Array<RequestType>): boolean => {
    return requestTypes.some((requestType) => this.errorOnceMap[requestType] === true);
  });

  // Combined request status
  requestStatus = computedFn((requestType: RequestType): RequestStatus => {
    const requested = this.requested(requestType);
    const loading = this.loading(requestType);
    const loaded = this.loaded(requestType);
    const loadedOnce = this.loadedOnce(requestType);
    const error = this.error(requestType);
    const errorOnce = this.errorOnce(requestType);
    return { requested, loading, loaded, loadedOnce, error, errorOnce };
  });

  @computed get requestAnyStatus(): RequestStatus {
    return {
      requested: this.anyRequested,
      loading: this.anyLoading,
      loaded: this.anyLoaded,
      loadedOnce: this.anyLoadedOnce,
      error: this.anyError,
      errorOnce: this.anyErrorOnce
    };
  }

  requestAnyOfStatus = computedFn((requestTypes: Array<RequestType>): RequestStatus => {
    return {
      requested: this.anyOfRequested(requestTypes),
      loading: this.anyOfLoading(requestTypes),
      loaded: this.anyOfLoaded(requestTypes),
      loadedOnce: this.anyOfLoadedOnce(requestTypes),
      error: this.anyOfError(requestTypes),
      errorOnce: this.anyOfErrorOnce(requestTypes)
    };
  });

  async waitForRequest(requestType: RequestType, timeout = DEFAULT_REQUEST_WAIT_TIMEOUT): Promise<boolean> {
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
    this.setLoadedOnce(requestType, true);
    this.setError(requestType, undefined);
    if (onSuccess) {
      onSuccess(response);
    }
  }

  @action onRequestError(requestType: RequestType, error: RequestError, onError?: (e: RequestError) => void): void {
    this.setRequested(requestType, true);
    this.setLoading(requestType, false);
    this.setError(requestType, error);
    this.setErrorOnce(requestType, true);
    if (onError) {
      onError(error);
    }
  }
}
