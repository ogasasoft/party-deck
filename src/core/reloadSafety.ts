type PhaseState = {
  phase: string;
};

type PhaseOf<TState extends PhaseState> = TState["phase"];

type PrefixFallback<TPhase extends string> = {
  prefix: string;
  fallback: TPhase;
};

export function sanitizeReloadPhase<TState extends PhaseState>(
  state: TState | null,
  exactFallbacks: Partial<Record<PhaseOf<TState>, PhaseOf<TState>>>,
  prefixFallbacks: PrefixFallback<PhaseOf<TState>>[] = []
): TState | null {
  if (!state) return null;
  const next = structuredClone(state) as TState;
  const exactFallback = exactFallbacks[next.phase as PhaseOf<TState>];
  if (exactFallback) {
    next.phase = exactFallback;
    return next;
  }

  const prefixFallback = prefixFallbacks.find((fallback) => next.phase.startsWith(fallback.prefix));
  if (prefixFallback) {
    next.phase = prefixFallback.fallback;
  }
  return next;
}
