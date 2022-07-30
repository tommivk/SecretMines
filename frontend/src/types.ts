import { Account } from "secretjs";

export type GameInfo = {
  address: string;
  label: string;
};

export type GameState = {
  board: Array<number>;
  game_over: boolean;
  winner: string | undefined;
  player_a: string | undefined;
  player_b: string | undefined;
  player_a_wants_rematch: boolean;
  player_b_wants_rematch: boolean;
  turn: string | undefined;
  bet: number;
  player_a_timed_out: boolean;
  player_b_timed_out: boolean;
  timeout: number;
  last_action_timestamp: number;
};

export type NewAccount = {
  address: string;
  balance: undefined;
};

export type UserAccount = Account | NewAccount;
