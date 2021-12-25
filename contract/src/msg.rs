use cosmwasm_std::HumanAddr;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub enum InitMsg {
    CreateGame {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum HandleMsg {
    Quess { index: u8 },
    Join {},
    Rematch {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum QueryMsg {
    GetBoard {},
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, JsonSchema)]
pub struct QueryResponse {
    pub board: [u8; 25],
    pub game_over: bool,
    pub winner: Option<HumanAddr>,
    pub player_a: Option<HumanAddr>,
    pub player_b: Option<HumanAddr>,
    pub player_a_wants_rematch: bool,
    pub player_b_wants_rematch: bool,
    pub turn: Option<HumanAddr>,
}
