# mobx-loading-store

[![](https://img.shields.io/npm/v/mobx-loading-store)](https://www.npmjs.com/package/mobx-loading-store)
[![Build](https://github.com/ezze/mobx-loading-store/actions/workflows/main.yml/badge.svg)](https://github.com/ezze/mobx-loading-store/actions/workflows/main.yml)
[![Coverage Status](https://coveralls.io/repos/github/ezze/mobx-loading-store/badge.svg)](https://coveralls.io/github/ezze/mobx-loading-store)
[![](https://img.shields.io/github/license/ezze/mobx-loading-store)](https://github.com/ezze/mobx-loading-store/blob/HEAD/LICENSE.md)

Abstract class for MobX store to control API requests' state out-of-the-box.

## Installation

```
pnpm install mobx-loading-store -P
```

## Usage

Extend your store from `LoadingStore` and use `request()` or `requestUndefined()` methods to make your API requests. It will allow you to control requests' statuses such as `loading`, `error`, `requested` and `loaded`.

The difference between `request()` and `requestUndefined()` is the former throws `LoadingStoreError` on request error, the latter returns `undefined`. In order to handle errors the former is more suitable.

```typescript
export type UserRequestType = 'load' | 'save';

export class UserStore extends LoadingStore<UserRequestType> {
  @observable user?: User;
  
  @action async load(id: number): Promise<User> {
    return this.request('load', async () => {
      const response = await api.user.load(id);
      return responseToUser(response);
    }, {
      onSuccess: (user) => {
        this.user = user;
      }
    });
  }
} 
```

In component (React is an example):

```typescript jsx
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { LoadingStoreError } from './loading.store';

import { UserStore } from './user.store';

export const UserName = observer(() => {
  const [userStore] = useState(() => new UserStore());
  const { user } = userStore;

  useEffect(() => {
    userStore.load().catch((e) => {
      if (e instanceof LoadingStoreError) {
        if (e.error.code === 401) {
          alert('User is not authorized');
          return;
        }
      }
     alert('Unable to load user data');
    });
  }, []);

  return <div>{user?.name}</div>;
}); 
```

### Request status

Each request's status is an `@observable` object of `RequestStatus` type consisting of the following boolean flags:

- `loading` — request is executing;
- `error` — request is added with error;
- `requested` — at least one request done, no matter whether it was successful or failed;
- `loaded` — latest request is successful (shorthand for `requested && !loading && !error`);

Request status can be retrieved at once by calling `requestStatus()`:

```typescript
const requestStatus = userStore.requestStatus('load');
const { loading, error, requested, loaded } = requestStatus;
```

Each request status flag can be retrieved separately:

```typescript
const loading = userStore.loading('load');
const error = userStore.error('load');
const requested = userStore.requested('load');
const loaded = userStore.loaded('load');
```

If store can execute few requests of different types the following can be used to detect whether at least one request has corresponding status flag set to `true`:

```typescript
const requestStatus = userStore.requestAnyStatus;
```

Corresponding separate properties are `anyLoading`, `anyError`, `anyRequested` and `anyLoaded`.

If you want to get the same request status combing only specific requests then `requestAnyOfStatus()` can be used:

```typescript
const requestStatus = userStore.requestAnyOfStatus(['load', 'save']);
```

Corresponding separate methods are `anyOfLoading()`, `anyOfError()`, `anyOfRequested()` and `anyOfLoaded()`.

If the latest request is ended with error (`error === true`) one can get error code and error instance:

```typescript
const error = userStore.error('load');
if (error) {
  const errorCode = userStore.errorCode('error');
  const errorInstance = userStore.errorInstance('error');
}
```

***IMPORTANT!***

In order to get error code and error instance `requestErrorExtractor` function must be passed to `LoadingStore` constructor.
By default handling `axios` errors only is supported at the moment.

## Build

```
pnpm build
```

## Develop

```
pnpm dev
```

## Test

```
pnpm lint
pnpm test
pnpm test:coverage
```

## Changelog

Changelog is available [here](CHANGELOG.md).

## License

[MIT](LICENSE.md)
