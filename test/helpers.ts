import { autorun } from 'mobx';

import { isRecord } from '../lib/utils';

export type PromiseStatus = 'pending' | 'fulfilled' | 'rejected';

export async function promiseStatus(promise: Promise<unknown>): Promise<PromiseStatus> {
  const t = {};
  return Promise.race([promise, t]).then(
    (response) => (response === t ? 'pending' : 'fulfilled'),
    () => 'rejected'
  );
}

export function expectError(error?: unknown, expected?: string | Error): void {
  expect(() => {
    throw error;
  }).toThrow(expected);
}

const promiseNotRejectedErrorMessage = 'Promise is not rejected';

export class PromiseNotRejectedError extends Error {
  constructor() {
    super(promiseNotRejectedErrorMessage);
  }
}

export function isPromiseNotRejectedError(value: unknown): value is PromiseNotRejectedError {
  return isRecord(value) && value.message === promiseNotRejectedErrorMessage;
}

// This hacky function can be used to test promise rejection in environment with fake timers
export function expectPromiseToReject(promise: Promise<unknown>, error?: string | Error): Promise<unknown> {
  return new Promise((resolve, reject) => {
    promise
      .then(() => {
        throw new PromiseNotRejectedError();
      })
      .catch((e) => {
        if (isPromiseNotRejectedError(e)) {
          throw e;
        }
        if (error !== undefined) {
          expectError(e, error);
        }
        resolve(e);
      })
      .catch(reject);
  });
}

export function flushPromises(): Promise<void> {
  const timers: { setImmediate: unknown } = jest.requireActual('timers');
  const setImmediate = timers.setImmediate as (...args: Array<unknown>) => void;
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

// MAGIC!!!
// https://stackoverflow.com/a/58716087/506695
export async function advanceTimers(ms: number): Promise<void> {
  await flushPromises();
  jest.advanceTimersByTime(ms);
  await flushPromises();
}

export async function runAllTimers(): Promise<void> {
  await flushPromises();
  jest.runAllTimers();
  await flushPromises();
}

export async function runOnlyPendingTimers(): Promise<void> {
  await flushPromises();
  jest.runOnlyPendingTimers();
  await flushPromises();
}

export async function runAllAndPendingTimers(): Promise<void> {
  await runAllTimers();
  await runOnlyPendingTimers();
}

export function wrapComputed(fn: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    // Using autorun is a workaround for computedFn warning: https://github.com/mobxjs/mobx-utils/issues/268
    autorun((reaction) => {
      try {
        fn();
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        reaction.dispose();
      }
    });
  });
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    global.setTimeout(resolve, ms);
  });
}
