'use strict';

import { Stream } from 'stream';

import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';

export type Event = APIGatewayProxyEvent | APIGatewayProxyEventV2;

export class HttpResponseStream {
  from(underlyingStream: unknown, prelude: unknown): unknown;
}

export type RequestHandler = (
  event: Event,
  streamResponse: Stream.WritableStream,
  ctx?: Context,
  callback?: Callback<unknown>,
) => unknown | Promise<unknown>;

declare global {
  namespace awslambda {
    function streamifyResponse(handler: RequestHandler, option?: unknown): RequestHandler;
    let HttpResponseStream: HttpResponseStream;
  }
}
