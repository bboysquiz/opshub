import { Router } from 'express';
import { issueCsrfToken } from '../csrf/csrf';

export const csrfRouter = Router();

csrfRouter.get('/csrf', (_req, res) => {
  issueCsrfToken(res);
  res.status(204).send();
});
