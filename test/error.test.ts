import { isLoadingStoreRequestError } from '../lib';

describe('error', () => {
  test('loading store request error', () => {
    expect(isLoadingStoreRequestError(new Error('Request error'))).toBeFalsy();
    expect(
      isLoadingStoreRequestError({ type: 'request', error: { code: 403, instance: new Error('Forbidden') } })
    ).toBeTruthy();
    expect(
      isLoadingStoreRequestError({ type: 'anotherRequest', error: { code: 401, instance: 'Unauthorized' } })
    ).toBeTruthy();
  });
});
