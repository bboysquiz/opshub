import express from 'express';
import type { Express } from 'express';
import cookieParser from 'cookie-parser';

export function applyParserMiddleware(app: Express): void {
  app.use(cookieParser());
  app.use(express.json());
}
