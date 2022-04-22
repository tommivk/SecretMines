use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use cosmwasm_std::{HumanAddr, Storage};
use cosmwasm_storage::{singleton, singleton_read, ReadonlySingleton, Singleton};

pub static CONFIG_KEY: &[u8] = b"config";

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct State {
    pub board: [u8; 25],
    pub mine_index: Option<u8>,
    pub bet: u64,
    pub player_a: Option<HumanAddr>,
    pub player_b: Option<HumanAddr>,
    pub player_a_wants_rematch: bool,
    pub player_b_wants_rematch: bool,
    pub turn: Option<HumanAddr>,
    pub last_quess: Option<u8>,
    pub game_over: bool,
    pub winner: Option<HumanAddr>,
}

pub fn config<S: Storage>(storage: &mut S) -> Singleton<S, State> {
    singleton(storage, CONFIG_KEY)
}

pub fn config_read<S: Storage>(storage: &S) -> ReadonlySingleton<S, State> {
    singleton_read(storage, CONFIG_KEY)
}
