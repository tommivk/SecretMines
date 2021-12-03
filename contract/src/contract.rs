use cosmwasm_std::{
    debug_print, to_binary, Api, Binary, Env, Extern, HandleResponse, InitResponse, Querier,
    StdError, StdResult, Storage,
};

use crate::msg::{HandleMsg, InitMsg, QueryMsg, QueryResponse};
use crate::state::{config, config_read, State};

pub fn init<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: InitMsg,
) -> StdResult<InitResponse> {
    let state = State {
        board: [0; 10],
        mine_index: 4,
        player_a: None,
        player_b: None,
        turn: None,
        last_quess: None,
        game_over: false,
        winner: None,
    };

    config(&mut deps.storage).save(&state)?;
    Ok(InitResponse::default())
}

pub fn handle<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: HandleMsg,
) -> StdResult<HandleResponse> {
    match msg {
        HandleMsg::Quess { index } => try_quess(deps, env, index),
        HandleMsg::Join {} => Ok(HandleResponse::default()),
    }
}

pub fn try_quess<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    index: u8,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;
    let sender = Some(env.message.sender.clone());

    if state.game_over {
        return Err(StdError::generic_err("Game is over"));
    }

    if sender != state.player_a && sender != state.player_b {
        return Err(StdError::generic_err("You're not a player"));
    }

    if state.turn != sender {
        return Err(StdError::generic_err("Not your turn"));
    }

    if index as usize >= state.board.len() {
        return Err(StdError::generic_err("Invalid quess"));
    }

    if state.board[index as usize] == 1 {
        return Err(StdError::generic_err("Square already quessed"));
    }

    let turn = if sender == state.player_a {
        state.player_b
    } else {
        state.player_a
    };

    if state.mine_index == index {
        config(&mut deps.storage).update(|mut state| {
            state.board[index as usize] = 1;
            state.game_over = true;
            state.winner = turn;
            state.last_quess = Some(index);
            Ok(state)
        })?;
        return Ok(HandleResponse {
            messages: vec![],
            log: vec![],
            data: Some(to_binary("game over or whatever")?),
        });
    }

    config(&mut deps.storage).update(|mut state| {
        state.board[index as usize] = 1;
        state.last_quess = Some(index);
        state.turn = turn;
        Ok(state)
    })?;

    Ok(HandleResponse::default())
}

pub fn query<S: Storage, A: Api, Q: Querier>(
    deps: &Extern<S, A, Q>,
    msg: QueryMsg,
) -> StdResult<Binary> {
    match msg {
        QueryMsg::GetBoard {} => to_binary(&query_board(deps)?),
    }
}

fn query_board<S: Storage, A: Api, Q: Querier>(deps: &Extern<S, A, Q>) -> StdResult<QueryResponse> {
    let state = config_read(&deps.storage).load()?;
    Ok(QueryResponse { board: state.board })
}
