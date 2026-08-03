import { createAgent, finalize } from './agent.js';
import { logger } from './logger.js';
import { APIGatewayProxyEvent } from 'aws-lambda';

export const handle = async (
  {
    message: message = 'こんにちは！',
    model: model = 'us.amazon.nova-micro-v1:0',
    session,
  }: { message: string, model: string, session: string }, output: NodeJS.WritableStream) => {
  const agent = createAgent({ model, session });
  try {
    for await (const event of agent.stream(message)) {
      // logger.trace('[Event]', event.type);
      if (event.type === 'modelStreamUpdateEvent') {
        if (event.event.type === 'modelContentBlockDeltaEvent' &&
          event.event.delta.type === 'textDelta') {
          if (event.event.delta.type === 'textDelta') {
            output.write(event.event.delta.text);
          }
        }
      }
    }
  } finally {
    await finalize();
  }
};

export const handler = awslambda.streamifyResponse(
  async (
    event: APIGatewayProxyEvent, responseStream: NodeJS.WritableStream,
  ) => {
    logger.debug('event', { event });
    const { message, model, session } = event.body ? JSON.parse(event.body) : {};
    await handle({ message, model, session }, responseStream);
    responseStream.end();
  });

export default handler;
