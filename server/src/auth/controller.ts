import type { Request, Response } from 'express';
import { isAuthError } from './errors';
import { loginSchema, registerSchema } from './schemas';
import { login, logout, me, refresh, register } from './service';
import { refreshClearCookieOptions, refreshCookieOptions } from './tokens';
import { headerToString } from './utils';

function handleAuthError(err: unknown, res: Response): Response {
  if (isAuthError(err)) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err);
  return res.status(500).json({ message: 'Internal server error' });
}

function getSessionMeta(req: Request): { userAgent: string | null; ip: string | null } {
  return {
    userAgent: headerToString(req.headers['user-agent']),
    ip: req.ip ?? null,
  };
}

export async function registerHandler(req: Request, res: Response): Promise<Response> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid body' });

  try {
    const result = await register(parsed.data, getSessionMeta(req));
    res.cookie('refresh_token', result.refreshToken, refreshCookieOptions());
    return res.status(201).json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    return handleAuthError(err, res);
  }
}

export async function loginHandler(req: Request, res: Response): Promise<Response> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid body' });

  try {
    const result = await login(parsed.data, getSessionMeta(req));
    res.cookie('refresh_token', result.refreshToken, refreshCookieOptions());
    return res.json({ accessToken: result.accessToken });
  } catch (err) {
    return handleAuthError(err, res);
  }
}

export async function refreshHandler(req: Request, res: Response): Promise<Response> {
  try {
    const result = await refresh(
      req.cookies?.refresh_token as string | undefined,
      getSessionMeta(req),
    );
    res.cookie('refresh_token', result.refreshToken, refreshCookieOptions());
    return res.json({ accessToken: result.accessToken });
  } catch (err) {
    return handleAuthError(err, res);
  }
}

export async function logoutHandler(req: Request, res: Response): Promise<Response> {
  try {
    await logout(req.cookies?.refresh_token as string | undefined);
    res.clearCookie('refresh_token', refreshClearCookieOptions());
    return res.status(204).send();
  } catch (err) {
    return handleAuthError(err, res);
  }
}

export async function meHandler(req: Request, res: Response): Promise<Response> {
  if (!req.user?.sub) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const user = await me(req.user.sub);
    return res.json(user);
  } catch (err) {
    return handleAuthError(err, res);
  }
}
