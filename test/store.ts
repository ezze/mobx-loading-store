import { LoadingStore } from '../lib';
import { RequestOptions } from '../lib/types';

import { anotherRequest, request, yetAnotherRequest } from './mocks';
import { RequestType } from './types';

export class TestStore extends LoadingStore<RequestType> {
  makeRequest(options?: RequestOptions<string>): Promise<string> {
    return this.request('request', request, options);
  }

  makeAnotherRequest(options?: RequestOptions<string>): Promise<string> {
    return this.request('anotherRequest', anotherRequest, options);
  }

  makeYetAnotherRequest(options?: RequestOptions<string>): Promise<string> {
    return this.request('yetAnotherRequest', yetAnotherRequest, options);
  }

  makeRequestUndefined(options?: RequestOptions<string>): Promise<string | undefined> {
    return this.requestUndefined('request', request, options);
  }
}
