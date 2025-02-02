import 'openai/shims/node';
import OpenAI, { toFile } from '@thoughtindustries/openai';
import { TranscriptionCreateParams } from '@thoughtindustries/openai/resources/audio/transcriptions';
import fetch from 'node-fetch';
import { File as FormDataFile, Blob as FormDataBlob } from 'formdata-node';
import * as fs from 'fs';
import { distance } from 'fastest-levenshtein';
import { ChatCompletion } from '@thoughtindustries/openai/resources/chat/completions';

const url = 'https://audio-samples.github.io/samples/mp3/blizzard_biased/sample-1.mp3';
const filename = 'sample-1.mp3';

const correctAnswer =
  'It was anxious to find him no one that expectation of a man who were giving his father enjoyment. But he was avoided in sight in the minister to which indeed,';
const model = 'whisper-1';

const client = new OpenAI();

async function typeTests() {
  // @ts-expect-error this should error if the `Uploadable` type was resolved correctly
  await client.audio.transcriptions.create({ file: { foo: true }, model: 'whisper-1' });
  // @ts-expect-error this should error if the `Uploadable` type was resolved correctly
  await client.audio.transcriptions.create({ file: null, model: 'whisper-1' });
  // @ts-expect-error this should error if the `Uploadable` type was resolved correctly
  await client.audio.transcriptions.create({ file: 'test', model: 'whisper-1' });
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeSimilarTo(comparedTo: string, expectedDistance: number): R;
    }
  }
}
expect.extend({
  toBeSimilarTo(received, comparedTo: string, expectedDistance: number) {
    const message = () =>
      [
        `Received: ${JSON.stringify(received)}`,
        `Expected: ${JSON.stringify(comparedTo)}`,
        `Expected distance: ${expectedDistance}`,
        `Received distance: ${actualDistance}`,
      ].join('\n');

    const actualDistance = distance(received, comparedTo);
    if (actualDistance < expectedDistance) {
      return {
        message,
        pass: true,
      };
    }

    return {
      message,
      pass: false,
    };
  },
});

it(`raw response`, async function () {
  const response = await client.chat.completions
    .create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: 'Say this is a test' }],
    })
    .asResponse();

  // test that we can use node-fetch Response API
  const chunks: string[] = [];
  const { body } = response;
  if (!body) throw new Error(`expected response.body to be defined`);
  body.on('data', (chunk) => chunks.push(chunk));
  await new Promise<void>((resolve, reject) => {
    body.once('end', resolve);
    body.once('error', reject);
  });
  const json: ChatCompletion = JSON.parse(chunks.join(''));
  expect(json.choices[0]?.message.content || '').toBeSimilarTo('This is a test', 10);
});

it(`streaming works`, async function () {
  const stream = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Say this is a test' }],
    stream: true,
  });
  const chunks = [];
  for await (const part of stream) {
    chunks.push(part);
  }
  expect(chunks.map((c) => c.choices[0]?.delta.content || '').join('')).toBeSimilarTo('This is a test', 10);
});

it('handles formdata-node File', async function () {
  const file = await fetch(url)
    .then((x) => x.arrayBuffer())
    .then((x) => new FormDataFile([x], filename));

  const params: TranscriptionCreateParams = { file, model };

  const result = await client.audio.transcriptions.create(params);
  expect(result.text).toBeSimilarTo(correctAnswer, 12);
});

// @ts-ignore avoid DOM lib for testing purposes
if (typeof File !== 'undefined') {
  it('handles builtinFile', async function () {
    const file = await fetch(url)
      .then((x) => x.arrayBuffer())
      // @ts-ignore avoid DOM lib for testing purposes
      .then((x) => new File([x], filename));

    const result = await client.audio.transcriptions.create({ file, model });
    expect(result.text).toBeSimilarTo(correctAnswer, 12);
  });
}

it('handles Response', async function () {
  const file = await fetch(url);

  const result = await client.audio.transcriptions.create({ file, model });
  expect(result.text).toBeSimilarTo(correctAnswer, 12);
});

it('handles fs.ReadStream', async function () {
  const result = await client.audio.transcriptions.create({
    file: fs.createReadStream('sample1.mp3'),
    model,
  });
  expect(result.text).toBeSimilarTo(correctAnswer, 12);
});

const fineTune = `{"prompt": "<prompt text>", "completion": "<ideal generated text>"}`;

describe('toFile', () => {
  it('handles form-data Blob', async function () {
    const result = await client.files.create({
      file: await toFile(
        new FormDataBlob([
          // @ts-ignore avoid DOM lib for testing purposes
          new TextEncoder().encode(fineTune),
        ]),
        'finetune.jsonl',
      ),
      purpose: 'fine-tune',
    });
    expect(result.status).toEqual('uploaded');
  });
  // @ts-ignore avoid DOM lib for testing purposes
  if (typeof Blob !== 'undefined') {
    it('handles builtin Blob', async function () {
      const result = await client.files.create({
        file: await toFile(
          // @ts-ignore avoid DOM lib for testing purposes
          new Blob([new TextEncoder().encode(fineTune)]),
          'finetune.jsonl',
        ),
        purpose: 'fine-tune',
      });
      expect(result.status).toEqual('uploaded');
    });
  }
  it('handles Uint8Array', async function () {
    const result = await client.files.create({
      file: await toFile(
        // @ts-ignore avoid DOM lib for testing purposes
        new TextEncoder().encode(fineTune),
        'finetune.jsonl',
      ),
      purpose: 'fine-tune',
    });
    expect(result.status).toEqual('uploaded');
  });
  it('handles ArrayBuffer', async function () {
    const result = await client.files.create({
      file: await toFile(
        // @ts-ignore avoid DOM lib for testing purposes
        new TextEncoder().encode(fineTune).buffer,
        'finetune.jsonl',
      ),
      purpose: 'fine-tune',
    });
    expect(result.status).toEqual('uploaded');
  });
  it('handles DataView', async function () {
    const result = await client.files.create({
      file: await toFile(
        // @ts-ignore avoid DOM lib for testing purposes
        new DataView(new TextEncoder().encode(fineTune).buffer),
        'finetune.jsonl',
      ),
      purpose: 'fine-tune',
    });
    expect(result.status).toEqual('uploaded');
  });
});
