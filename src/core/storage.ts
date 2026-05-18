import { ActiveSessionRef, DEFAULT_PLAYERS, GameId, Player } from "./types";

const PLAYER_KEY = "party:v1:players";
const APP_STATE_KEY = "party:v1:app-state";

export type GameSessionEnvelope<TState> = ActiveSessionRef & {
  state: TState;
  createdAt: string;
  updatedAt: string;
};

export function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(PLAYER_KEY);
    if (!raw) return DEFAULT_PLAYERS;
    const parsed = JSON.parse(raw) as Player[];
    if (!Array.isArray(parsed) || parsed.length < 2) return DEFAULT_PLAYERS;
    return parsed.slice(0, 8);
  } catch {
    return DEFAULT_PLAYERS;
  }
}

export function savePlayers(players: Player[]) {
  localStorage.setItem(PLAYER_KEY, JSON.stringify(players.slice(0, 8)));
}

export function loadAppState<T>(): T | null {
  try {
    const raw = localStorage.getItem(APP_STATE_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveAppState(data: unknown) {
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(data));
}

export function clearAppState() {
  localStorage.removeItem(APP_STATE_KEY);
}

export function createSessionId(gameId: GameId) {
  return `${gameId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

export function gameSessionKey(sessionId: string, gameId: GameId) {
  return `party:v1:sessions:${sessionId}:game:${gameId}`;
}

export function loadGameSession<TState>(sessionId: string, gameId: GameId): GameSessionEnvelope<TState> | null {
  try {
    const raw = localStorage.getItem(gameSessionKey(sessionId, gameId));
    return raw ? (JSON.parse(raw) as GameSessionEnvelope<TState>) : null;
  } catch {
    return null;
  }
}

export function saveGameSession<TState>(session: GameSessionEnvelope<TState>) {
  localStorage.setItem(gameSessionKey(session.sessionId, session.gameId), JSON.stringify(session));
}

export function clearGameSession(session: ActiveSessionRef | null) {
  if (!session) return;
  localStorage.removeItem(gameSessionKey(session.sessionId, session.gameId));
}
