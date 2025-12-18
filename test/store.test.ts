import { reaction } from 'mobx';

import { RequestStatus, Store } from '../lib';

import {
  initialLoadingRequestStatus,
  initialRequestStatus,
  singleErrorRequestStatus,
  singleSuccessRequestStatus
} from './const';
import {
  advanceTimers,
  delay,
  expectError,
  expectPromiseToReject,
  promiseStatus,
  runAllTimers,
  runOnlyPendingTimers,
  wrapComputed
} from './helpers';
import { anotherRequest, request, yetAnotherRequest } from './mocks';
import { TestStore } from './store';
import { RequestType } from './types';

interface TestStoreInterface extends Store {
  doInit(): Promise<void>;
  doDispose(): Promise<void>;
}

describe('loading store', () => {
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

  function expectStatus(store: TestStore, requestType: RequestType, requestStatus: RequestStatus): Promise<void> {
    return wrapComputed(() => expect(store.requestStatus(requestType)).toStrictEqual(requestStatus));
  }

  function createStore(): TestStoreInterface {
    return new TestStore() as unknown as TestStoreInterface;
  }

  describe('initialization / disposing', () => {
    test('successful initialization / disposing', async () => {
      const store = createStore();

      const doInitSpy = jest.spyOn(store, 'doInit');
      const doDisposeSpy = jest.spyOn(store, 'doDispose');

      expect(store.initialized).toBe(false);
      expect(store.initializing).toBe(false);
      expect(store.disposed).toBe(false);
      expect(store.disposing).toBe(false);
      expect(doInitSpy).toHaveBeenCalledTimes(0);
      expect(doDisposeSpy).toHaveBeenCalledTimes(0);

      const initPromise = store.init();
      expect(store.initialized).toBe(false);
      expect(store.initializing).toBe(true);
      expect(store.disposed).toBe(false);
      expect(store.disposing).toBe(false);
      expect(doInitSpy).toHaveBeenCalledTimes(1);
      expect(doDisposeSpy).toHaveBeenCalledTimes(0);

      await initPromise;
      expect(store.initialized).toBe(true);
      expect(store.initializing).toBe(false);
      expect(store.disposed).toBe(false);
      expect(store.disposing).toBe(false);
      expect(doInitSpy).toHaveBeenCalledTimes(1);
      expect(doDisposeSpy).toHaveBeenCalledTimes(0);

      const disposePromise = store.dispose();
      expect(store.disposed).toBe(false);
      expect(store.disposing).toBe(true);
      expect(doDisposeSpy).toHaveBeenCalledTimes(1);

      await disposePromise;
      expect(store.disposed).toBe(true);
      expect(store.disposing).toBe(false);
      expect(doDisposeSpy).toHaveBeenCalledTimes(1);
    });

    test('unsuccessful initialization', async () => {
      const store = createStore();

      const doInitSpy = jest.spyOn(store, 'doInit').mockRejectedValueOnce(new Error('Initialization failed'));

      expect(store.initialized).toBe(false);
      expect(store.initializing).toBe(false);

      const initPromise = store.init();
      expect(store.initialized).toBe(false);
      expect(store.initializing).toBe(true);

      await expect(initPromise).rejects.toThrow('Initialization failed');

      expect(store.initialized).toBe(false);
      expect(store.initializing).toBe(false);
      expect(doInitSpy).toHaveBeenCalledTimes(1);
    });

    test('unsuccessful disposing', async () => {
      const store = createStore();

      const doDisposeSpy = jest.spyOn(store, 'doDispose').mockRejectedValueOnce(new Error('Disposing failed'));

      await store.init();

      expect(store.disposed).toBe(false);
      expect(store.disposing).toBe(false);

      const disposePromise = store.dispose();
      expect(store.disposed).toBe(false);
      expect(store.disposing).toBe(true);

      await expect(disposePromise).rejects.toThrow('Disposing failed');

      expect(store.disposed).toBe(false);
      expect(store.disposing).toBe(false);
      expect(doDisposeSpy).toHaveBeenCalledTimes(1);
    });

    test('waiting for initialization / disposing', async () => {
      jest.useRealTimers(); // we want to test it with real timers

      const store = createStore();

      const doInitSpy = jest.spyOn(store, 'doInit').mockImplementationOnce(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
      });

      const doDisposeSpy = jest.spyOn(store, 'doDispose').mockImplementationOnce(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
      });

      store.init();
      expect(store.initialized).toBe(false);
      await store.whenInitialized();
      expect(store.initialized).toBe(true);
      expect(doInitSpy).toHaveBeenCalledTimes(1);
      expect(doDisposeSpy).toHaveBeenCalledTimes(0);

      store.dispose();
      expect(store.disposed).toBe(false);
      await store.whenDisposed();
      expect(store.disposed).toBe(true);
      expect(doInitSpy).toHaveBeenCalledTimes(1);
      expect(doDisposeSpy).toHaveBeenCalledTimes(1);

      jest.useFakeTimers(); // revert back to fake timers for proper afterEach handling
    });
  });

  describe('single successful request', () => {
    async function executeTest(undefinedOnFailure: boolean): Promise<void> {
      const store = new TestStore();

      await expectStatus(store, 'request', initialRequestStatus);

      const promise = undefinedOnFailure ? store.makeRequestUndefined() : store.makeRequest();
      expect(await promiseStatus(promise)).toBe('pending');

      await advanceTimers(50);

      expect(await promiseStatus(promise)).toBe('pending');
      await expectStatus(store, 'request', initialLoadingRequestStatus);

      await runAllTimers();

      expect(await promiseStatus(promise)).toBe('fulfilled');
      await expectStatus(store, 'request', singleSuccessRequestStatus);
      expect(await promise).toBe('response');
      expect(request).toHaveBeenCalledTimes(1);
    }

    test('throw on failure', () => executeTest(false));
    test('undefined on failure', () => executeTest(true));
  });

  describe('single failed request', () => {
    async function executeTest(undefinedOnFailure: boolean): Promise<void> {
      request.mockImplementationOnce(async () => {
        await delay(100);
        throw new TypeError("Something's going wrong");
      });

      const store = new TestStore();

      await expectStatus(store, 'request', initialRequestStatus);

      const promise = undefinedOnFailure ? store.makeRequestUndefined() : store.makeRequest();

      expect(await promiseStatus(promise)).toBe('pending');
      if (!undefinedOnFailure) {
        expectPromiseToReject(promise, 'Request "request" failed');
      }

      await advanceTimers(50);

      expect(await promiseStatus(promise)).toBe('pending');
      await expectStatus(store, 'request', initialLoadingRequestStatus);

      await runAllTimers();

      if (undefinedOnFailure) {
        expect(await promiseStatus(promise)).toBe('fulfilled');
        expect(await promise).toBe(undefined);
      } else {
        expect(await promiseStatus(promise)).toBe('rejected');
      }

      await expectStatus(store, 'request', singleErrorRequestStatus);
      expect(request).toHaveBeenCalledTimes(1);
      await wrapComputed(() => expectError(store.errorInstance('request'), "Something's going wrong"));
    }

    test('throw on failure', () => executeTest(false));
    test('undefined on failure', () => executeTest(true));
  });

  test('two concurrent successful requests of the different types', async () => {
    const store = new TestStore();

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
    const store = new TestStore();

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
    const store = new TestStore();

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
    await expectStatus(store, 'request', singleSuccessRequestStatus);
    expect(request).toHaveBeenCalledTimes(1);
  });

  describe('reset request status', () => {
    async function executeTest(singleReset: boolean): Promise<void> {
      anotherRequest.mockImplementationOnce(async () => {
        await delay(200);
        throw new Error('Error');
      });

      const store = new TestStore();

      await expectStatus(store, 'request', initialRequestStatus);
      await expectStatus(store, 'anotherRequest', initialRequestStatus);

      store.makeRequest();
      const anotherPromise = store.makeAnotherRequest();

      expectPromiseToReject(anotherPromise);

      await runAllTimers();

      await expectStatus(store, 'request', singleSuccessRequestStatus);
      await expectStatus(store, 'anotherRequest', singleErrorRequestStatus);

      store.resetRequestStatus(singleReset ? 'request' : undefined);

      await expectStatus(store, 'request', initialRequestStatus);
      await expectStatus(store, 'anotherRequest', singleReset ? singleErrorRequestStatus : initialRequestStatus);
    }

    test('multiple reset', () => executeTest(true));
    test('single reset', () => executeTest(true));
  });

  describe('callbacks', () => {
    test('successful callback', async () => {
      const store = new TestStore();

      const onSuccess = jest.fn();
      const onError = jest.fn();

      store.makeRequest({ onSuccess, onError });

      await runAllTimers();

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith('response');
      expect(onError).toHaveBeenCalledTimes(0);
    });

    test('error callback', async () => {
      request.mockImplementationOnce(async () => {
        await delay(100);
        throw new Error("Something's going really wrong");
      });

      const store = new TestStore();

      const onSuccess = jest.fn();
      const onError = jest.fn();

      const promise = store.makeRequest({ onSuccess, onError });
      expectPromiseToReject(promise, 'Request "request" failed');

      await runAllTimers();

      expect(onSuccess).toHaveBeenCalledTimes(0);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith({ code: -1, instance: new TypeError("Something's going really wrong") });
    });
  });

  test('react to request status changes', async () => {
    const store = new TestStore();

    const reactionFn = jest.fn();

    const dispose = reaction(() => store.loading('request'), reactionFn);

    store.makeRequest();

    await runAllTimers();

    expect(reactionFn).toHaveBeenCalledTimes(2);
    expect(reactionFn).toHaveBeenNthCalledWith(1, true, false, expect.anything());
    expect(reactionFn).toHaveBeenNthCalledWith(2, false, true, expect.anything());

    dispose();
  });
});
