import * as shims from '@thoughtindustries/openai/_shims/index';

test('openai/shims/node', () => {
  expect(shims.kind).toEqual('node');
});
