#!/usr/bin/env -S yarn tsn -T

import OpenAI from '@thoughtindustries/openai';

// gets API Key from environment variable OPENAI_API_KEY
const client = new OpenAI();

async function main() {
  // getting just raw Response:
  {
    const response = await client.completions
      .create({
        prompt: 'Say this is a test',
        model: 'gpt-3.5-turbo-instruct',
      })
      .asResponse();
    console.log(`response headers: `, Object.fromEntries(response.headers.entries()));
    console.log(`response json: `, await response.json());
  }

  // getting the usual return value plus raw Response:
  {
    const { data: completion, response } = await client.completions
      .create({
        prompt: 'Say this is a test',
        model: 'gpt-3.5-turbo-instruct',
      })
      .withResponse();
    console.log(`response headers: `, Object.fromEntries(response.headers.entries()));
    console.log(`completion: `, completion);
  }
}

main().catch(console.error);
