import { RequestStatus } from '../lib/types';

export const initialRequestStatus: RequestStatus = {
  requested: false,
  loading: false,
  loaded: false,
  loadedOnce: false,
  error: false,
  errorOnce: false
};

export const initialLoadingRequestStatus: RequestStatus = { ...initialRequestStatus, loading: true };

export const singleSuccessRequestStatus: RequestStatus = {
  requested: true,
  loading: false,
  loaded: true,
  loadedOnce: true,
  error: false,
  errorOnce: false
};

export const singleErrorRequestStatus: RequestStatus = {
  requested: true,
  loading: false,
  loaded: false,
  loadedOnce: false,
  error: true,
  errorOnce: true
};
