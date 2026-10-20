export type Token =
  "pumpkin" | "ghost" | "vampire" | "witch" | "rattle" | "sparks" | "warps";
export interface Player {
  id: string;
  name: string;
  token: Token;
  color?: string;
  bot?: boolean;
  position: number;
  money: number;
  propertyIds: number[];
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
}
export type SpaceType =
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "community"
  | "corner";
export interface BoardSpace {
  id: number;
  name: string;
  type: SpaceType;
  price?: number;
  rent?: number[];
  group?: string;
  color?: string;
  amount?: number;
}
export interface PropertyState {
  ownerId: string | null;
  buildings: number;
  mortgaged: boolean;
}
export type GamePhase = "opening" | "roll" | "purchase" | "card" | "end";
export interface PendingCard {
  deck: "chance" | "community";
  index: number;
  text: string;
  amount: number;
  playerId: string;
  revision: number;
}
export interface OpeningState {
  stage: "tour" | "introductions" | "order" | "ready";
  spotlightIndex: number;
  round: number;
  candidateIds: string[];
  rolls: Record<string, [number, number]>;
  history: { round: number; playerId: string; dice: [number, number] }[];
  winnerId: string | null;
}
export interface GameState {
  mode?: "single" | "online" | "local";
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  phase: GamePhase;
  properties: Record<number, PropertyState>;
  dice: [number, number] | null;
  revision: number;
  status: "playing" | "finished";
  doubles: number;
  extraTurn: boolean;
  log: string[];
  movement: {
    playerId: string;
    from: number;
    steps: number;
    revision: number;
  } | null;
  opening?: OpeningState | null;
  pendingCard?: PendingCard | null;
}
export type Action =
  | { type: "build" | "sell-building"; playerId: string; spaceId: number }
  | { type: "roll"; playerId: string }
  | {
      type:
        | "buy"
        | "pass"
        | "end"
        | "bail"
        | "resign"
        | "advance-intro"
        | "skip-intro"
        | "opening-roll"
        | "begin"
        | "ack-card";
      playerId: string;
    };
