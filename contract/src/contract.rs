use cosmwasm_std::{
    to_binary, Api, Binary, Env, Extern, HandleResponse, InitResponse, Querier, StdError,
    StdResult, Storage,
};

use crate::msg::{HandleMsg, InitMsg, QueryMsg, QueryResponse};
use crate::state::{config, config_read, State};

use rand::{RngCore, SeedableRng};
use rand_chacha::ChaChaRng;
use sha2::{Digest, Sha256};

pub fn init<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    _env: Env,
    _msg: InitMsg,
) -> StdResult<InitResponse> {
    let init_seed = [0_u8; 32];
    deps.storage.set(b"seed", &init_seed);
    let state = State {
        board: [0; 25],
        mine_index: None,
        player_a: None,
        player_b: None,
        player_a_wants_rematch: false,
        player_b_wants_rematch: false,
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
        HandleMsg::Join {} => try_join(deps, env),
        HandleMsg::Rematch {} => try_rematch(deps, env),
    }
}

pub fn try_rematch<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;
    let sender = Some(env.message.sender.clone());

    if !state.game_over {
        return Err(StdError::generic_err("Game not finished yet!"));
    }

    if state.player_a.is_none() || state.player_b.is_none() {
        return Err(StdError::generic_err("Game not started yet!"));
    }

    if sender != state.player_a || sender != state.player_b {
        return Err(StdError::generic_err("You are not a player!"));
    }

    if sender == state.player_a {
        config(&mut deps.storage).update(|mut state| {
            state.player_a_wants_rematch = true;
            Ok(state)
        })?;
    }
    if sender == state.player_b {
        config(&mut deps.storage).update(|mut state| {
            state.player_b_wants_rematch = true;
            Ok(state)
        })?;
    }

    if state.player_a_wants_rematch && state.player_b_wants_rematch {
        let mut seed = deps.storage.get(b"seed").unwrap();
        seed.extend(&env.block.height.to_be_bytes());
        seed.extend(&env.block.time.to_be_bytes());

        let new_seed: [u8; 32] = Sha256::digest(&seed).into();
        deps.storage.set(b"seed", &new_seed);

        let mut rng = ChaChaRng::from_seed(new_seed);
        let random = (rng.next_u32() % 25) as u8;

        config(&mut deps.storage).update(|mut state| {
            state.board = [0; 25];
            state.mine_index = Some(random);
            state.player_a = state.player_a;
            state.player_b = state.player_b;
            state.player_a_wants_rematch = false;
            state.player_b_wants_rematch = false;
            state.turn = state.winner;
            state.last_quess = None;
            state.game_over = false;
            state.winner = None;
            Ok(state)
        })?;
    }

    return Ok(HandleResponse {
        messages: vec![],
        log: vec![],
        data: Some(to_binary("Ok")?),
    });
}

pub fn try_join<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;
    let sender = Some(env.message.sender.clone());

    let mut seed = deps.storage.get(b"seed").unwrap();
    seed.extend(env.message.sender.to_string().as_bytes().to_vec());
    seed.extend(env.block.chain_id.as_bytes().to_vec());
    seed.extend(&env.block.height.to_be_bytes());
    seed.extend(&env.block.time.to_be_bytes());
    let new_seed: [u8; 32] = Sha256::digest(&seed).into();
    deps.storage.set(b"seed", &new_seed);

    if state.player_a.is_some() && state.player_b.is_some() {
        return Err(StdError::generic_err("Game is full!"));
    }

    if state.player_a == sender || state.player_b == sender {
        return Err(StdError::generic_err("You have already joined!"));
    }

    if state.player_a.is_none() {
        config(&mut deps.storage).update(|mut state| {
            state.player_a = sender.clone();
            Ok(state)
        })?;

        return Ok(HandleResponse {
            messages: vec![],
            log: vec![],
            data: Some(to_binary("Welcome to secret mines")?),
        });
    } else {
        let mut rng = ChaChaRng::from_seed(new_seed);
        let random = (rng.next_u32() % 25) as u8;
        config(&mut deps.storage).update(|mut state| {
            state.player_b = sender.clone();
            state.turn = sender;
            state.mine_index = Some(random);
            Ok(state)
        })?;
        return Ok(HandleResponse {
            messages: vec![],
            log: vec![],
            data: Some(to_binary("Welcome to secret mines")?),
        });
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

    if state.mine_index.unwrap() == index {
        config(&mut deps.storage).update(|mut state| {
            state.board[index as usize] = 2;
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

    Ok(HandleResponse {
        messages: vec![],
        log: vec![],
        data: Some(to_binary("Miss!")?),
    })
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
    Ok(QueryResponse {
        board: state.board,
        game_over: state.game_over,
        winner: state.winner,
        player_a: state.player_a,
        player_b: state.player_b,
        turn: state.turn,
    })
}
