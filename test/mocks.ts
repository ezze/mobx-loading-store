import { delay } from './helpers';

export const request = jest.fn(async () => {
  await delay(100);
  return 'response';
});

export const anotherRequest = jest.fn(async () => {
  await delay(200);
  return 'another-response';
});

export const yetAnotherRequest = jest.fn(async () => {
  await delay(300);
  return 'yet-another-response';
});
