import { LoadingStore } from '../lib';
import { RequestOptions, RequestStatus } from '../lib/types';

import {
  initialLoadingRequestStatus,
  initialRequestStatus,
  singleErrorRequestStatus,
  singleSuccessRequestStatus
} from './const';
import {
  advanceTimers,
  expectError,
  expectPromiseToReject,
  promiseStatus,
  runAllTimers,
  runOnlyPendingTimers,
  wrapComputed
} from './helpers';

describe('loading store', () => {
  type RequestType = 'request' | 'anotherRequest' | 'yetAnotherRequest';

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      global.setTimeout(resolve, ms);
    });
  }

  const request = jest.fn(async () => {
    await delay(100);
    return 'response';
  });
  const anotherRequest = jest.fn(async () => {
    await delay(200);
    return 'another-response';
  });
  const yetAnotherRequest = jest.fn(async () => {
    await delay(300);
    return 'yet-another-response';
  });

  beforeEach(() => {
    request.mockClear();
    anotherRequest.mockClear();
    yetAnotherRequest.mockClear();
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await runOnlyPendingTimers();
    jest.useRealTimers();
  });

  class Store extends LoadingStore<RequestType> {
    makeRequest(options?: RequestOptions<string>): Promise<string> {
      return this.request('request', request, options);
    }

    makeAnotherRequest(options?: RequestOptions<string>): Promise<string> {
      return this.request('anotherRequest', anotherRequest, options);
    }

    makeYetAnotherRequest(options?: RequestOptions<string>): Promise<string> {
      return this.request('yetAnotherRequest', yetAnotherRequest, options);
    }
  }

  function expectStatus(store: Store, requestType: RequestType, requestStatus: RequestStatus): Promise<void> {
    return wrapComputed(() => expect(store.requestStatus(requestType)).toStrictEqual(requestStatus));
  }

  test('single successful request', async () => {
    const store = new Store();

    await expectStatus(store, 'request', initialRequestStatus);

    const promise = store.makeRequest();
    expect(await promiseStatus(promise)).toBe('pending');

    await advanceTimers(50);

    expect(await promiseStatus(promise)).toBe('pending');
    await expectStatus(store, 'request', initialLoadingRequestStatus);

    await runAllTimers();

    expect(await promiseStatus(promise)).toBe('fulfilled');
    await expectStatus(store, 'request', singleSuccessRequestStatus);
    expect(await promise).toBe('response');
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('single failed request', async () => {
    request.mockImplementationOnce(async () => {
      await delay(100);
      throw new TypeError("Something's going wrong");
    });

    const store = new Store();

    await expectStatus(store, 'request', initialRequestStatus);

    const promise = store.makeRequest();

    expect(await promiseStatus(promise)).toBe('pending');
    expectPromiseToReject(promise, 'Request "request" failed');

    await advanceTimers(50);

    expect(await promiseStatus(promise)).toBe('pending');
    await expectStatus(store, 'request', initialLoadingRequestStatus);

    await runAllTimers();

    expect(await promiseStatus(promise)).toBe('rejected');
    await expectStatus(store, 'request', singleErrorRequestStatus);
    expect(request).toHaveBeenCalledTimes(1);
    await wrapComputed(() => expectError(store.errorInstance('request'), "Something's going wrong"));
  });

  test('two concurrent successful requests of the different types', async () => {
    const store = new Store();

    await expectStatus(store, 'request', initialRequestStatus);
    await expectStatus(store, 'anotherRequest', initialRequestStatus);
    expect(store.requestAnyStatus).toStrictEqual(initialRequestStatus);

    const promise = store.makeRequest();
    const anotherPromise = store.makeAnotherRequest();

    await advanceTimers(50);

    await expectStatus(store, 'request', initialLoadingRequestStatus);
    await expectStatus(store, 'anotherRequest', initialLoadingRequestStatus);
    expect(store.requestAnyStatus).toStrictEqual(initialLoadingRequestStatus);

    await advanceTimers(100);

    await expectStatus(store, 'request', singleSuccessRequestStatus);
    await expectStatus(store, 'anotherRequest', initialLoadingRequestStatus);
    expect(store.requestAnyStatus).toStrictEqual({ ...singleSuccessRequestStatus, loading: true });

    await runAllTimers();

    await expectStatus(store, 'request', singleSuccessRequestStatus);
    await expectStatus(store, 'anotherRequest', singleSuccessRequestStatus);
    expect(store.requestAnyStatus).toStrictEqual(singleSuccessRequestStatus);
    expect(await promise).toBe('response');
    expect(await anotherPromise).toBe('another-response');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('concurrent successful requests of the same type', async () => {
    const store = new Store();

    await expectStatus(store, 'request', initialRequestStatus);

    const promise1 = store.makeRequest();

    expect(await promiseStatus(promise1)).toBe('pending');

    await advanceTimers(50);

    expect(await promiseStatus(promise1)).toBe('pending');
    await expectStatus(store, 'request', initialLoadingRequestStatus);

    const promise2 = store.makeRequest();

    expect(await promiseStatus(promise1)).toBe('pending');
    expect(await promiseStatus(promise2)).toBe('pending');

    await advanceTimers(50);

    expect(await promiseStatus(promise1)).toBe('fulfilled');
    expect(await promiseStatus(promise2)).toBe('pending');
    await expectStatus(store, 'request', { ...singleSuccessRequestStatus, loading: true, loaded: false });

    await runAllTimers();

    expect(await promiseStatus(promise2)).toBe('fulfilled');
    await expectStatus(store, 'request', singleSuccessRequestStatus);
    expect(request).toHaveBeenCalledTimes(2);
  });

  test('timed out concurrent request of the same type', async () => {
    const store = new Store();

    await expectStatus(store, 'request', initialRequestStatus);

    const promise1 = store.makeRequest();

    expect(await promiseStatus(promise1)).toBe('pending');

    await advanceTimers(50);

    await expectStatus(store, 'request', initialLoadingRequestStatus);

    const promise2 = store.makeRequest({ waitTimeout: 25 });

    expect(await promiseStatus(promise1)).toBe('pending');
    expect(await promiseStatus(promise2)).toBe('pending');

    await advanceTimers(30);

    expect(await promiseStatus(promise1)).toBe('pending');
    expect(await promiseStatus(promise2)).toBe('rejected');
    await expectStatus(store, 'request', initialLoadingRequestStatus);

    await runAllTimers();

    expect(await promiseStatus(promise1)).toBe('fulfilled');
    expect(await promiseStatus(promise2)).toBe('rejected');
    expectPromiseToReject(promise2, 'Request "request" is timed out');
    await expectStatus(store, 'request', {
      requested: true,
      loading: false,
      loaded: true,
      loadedOnce: true,
      error: false,
      errorOnce: false
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
});
