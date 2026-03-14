import type { LocalTicket, UpdateTicketInput } from './models';

const PATCH_KEYS = ['title', 'description', 'status', 'priority', 'assignedTo'] as const;

type TicketPatchKey = (typeof PATCH_KEYS)[number];
type TicketPatchSnapshot = Pick<LocalTicket, TicketPatchKey>;

export function buildTicketUpdatePatch(
  current: TicketPatchSnapshot,
  candidate: UpdateTicketInput,
): UpdateTicketInput {
  const patch: UpdateTicketInput = {};
  const proxyTarget = patch as Record<TicketPatchKey, unknown>;

  const draft = new Proxy(proxyTarget, {
    set(target, property, value) {
      const key = property as TicketPatchKey;

      if (value === undefined || Object.is(current[key], value)) {
        delete target[key];
        return true;
      }

      target[key] = value;
      return true;
    },
  });

  for (const key of PATCH_KEYS) {
    draft[key] = candidate[key];
  }

  return patch;
}

export function hasTicketUpdateChanges(patch: UpdateTicketInput): boolean {
  return PATCH_KEYS.some((key) => patch[key] !== undefined);
}
