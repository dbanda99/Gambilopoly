export type Token = "pumpkin" | "ghost" | "vampire" | "witch";
export interface Player {
  id: string;
  name: string;
  token: Token;
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
export type GamePhase = "roll" | "purchase" | "end";
export interface GameState {
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
}
export type Action =
  | { type: "roll"; playerId: string }
  | { type: "buy" | "pass" | "end" | "bail" | "resign"; playerId: string };
