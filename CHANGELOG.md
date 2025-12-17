# Changelog

## 0.9.1 (2025-12-17)

- `doInit()` and `doDispose()` are protected.

## 0.9.0 (2025-12-17)

- Store initialization/disposing logic is improved providing additional states such as `initializing`, `disposing` and `disposed`.
- Dependencies are upgraded.

## 0.8.0 (2025-12-12)

- Methods to change the request status are public now, while the request status itself is protected.

## 0.7.1 (2025-09-15)

- Add `types` to `exports` in `package.json` allowing to resolve types in `bundler` module resolution.

## 0.7.0 (2025-07-28)

- Export significant types.
- Development dependencies are upgraded.

## 0.6.1 (2025-04-25)

- Fix initialization method in MobX strict mode by decorating it by `@action`.

## 0.6.0 (2025-04-23)

- `loadedOnce` and `errorOnce` request states are added.
- `makeObservable(this)` is not used anymore.

## 0.5.0 (2025-04-18)

- Add library `exports` property to `package.json`, specify Common.js module in `main`.

## 0.4.0 (2025-02-08)

- Exclude `mobx` and `mobx-utils` from the build.
- Support MobX starting with 6.11.0 when `accessor` keyword was introduced with modern 2022.3 decorators support.

## 0.3.0 (2025-02-08)

- Use named exports only.

## 0.2.0 (2025-02-08)

- Export `LoadingStore` as default from `index.ts`, add error related stuff exports.

## 0.1.0 (2025-02-07)

- Initial release.
