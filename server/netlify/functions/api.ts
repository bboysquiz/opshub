import type { Handler } from '@netlify/functions';
import serverless from 'serverless-http';
import { createApp } from '../../src/app/create-app';

export const handler = serverless(createApp()) as unknown as Handler;
