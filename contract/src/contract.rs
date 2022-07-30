use cosmwasm_std::{
    to_binary, Api, BankMsg, Binary, Coin, CosmosMsg, Env, Extern, HandleResponse, HumanAddr,
    InitResponse, InitResult, Querier, StdError, StdResult, Storage, Uint128,
};

use crate::msg::{HandleMsg, InitMsg, QueryMsg, QueryResponse};
use crate::state::{config, config_read, State};

use rand::{RngCore, SeedableRng};
use rand_chacha::ChaChaRng;
use sha2::{Digest, Sha256};

pub fn init<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: InitMsg,
) -> InitResult {
    match msg {
        InitMsg::CreateGame { bet, timeout } => {
            if env.message.sent_funds.len() == 0 || bet == 0 {
                return Err(StdError::generic_err("Bet is required"));
            }

            if env.message.sent_funds[0].denom != "uscrt" {
                return Err(StdError::generic_err("Denom must be uscrt"));
            }

            if (env.message.sent_funds[0].amount.u128() as u64) < bet {
                return Err(StdError::generic_err("Insufficient amount sent"));
            }

            if timeout < 30 || timeout > 300 {
                return Err(StdError::generic_err(
                    "Timeout must be between 30 and 300 seconds",
                ));
            }

            let init_seed = [0_u8; 32];
            deps.storage.set(b"seed", &init_seed);
            let state = State {
                board: [0; 25],
                mine_index: None,
                bet,
                player_a: Some(env.message.sender.clone()),
                player_b: None,
                player_a_wants_rematch: false,
                player_b_wants_rematch: false,
                turn: None,
                last_quess: None,
                game_over: false,
                winner: None,
                last_action_timestamp: None,
                player_a_timed_out: false,
                player_b_timed_out: false,
                timeout,
            };

            config(&mut deps.storage).save(&state)?;
            Ok(InitResponse::default())
        }
    }
}

pub fn handle<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
    msg: HandleMsg,
) -> StdResult<HandleResponse> {
    match msg {
        HandleMsg::Quess { index } => try_quess(deps, env, index),
        HandleMsg::Join { secret } => try_join(deps, env, secret),
        HandleMsg::Rematch {} => try_rematch(deps, env),
        HandleMsg::Withdraw {} => try_withdraw(deps, env),
        HandleMsg::Timeout {} => try_timeout(deps, env),
    }
}

pub fn try_withdraw<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;
    let sender = Some(env.message.sender.clone());
    let bet = state.bet;

    if sender == state.player_a && state.player_b.is_none() {
        config(&mut deps.storage).update(|mut state| {
            state.player_a = None;
            Ok(state)
        })?;
        return Ok(withdraw_bet(
            env.contract.address,
            sender.unwrap(),
            Uint128(bet as u128),
        ));
    }

    if sender == state.player_a
        && state.player_a_wants_rematch
        && !state.player_b_wants_rematch
        && state.game_over
    {
        config(&mut deps.storage).update(|mut state| {
            state.player_a_wants_rematch = false;
            Ok(state)
        })?;
        return Ok(withdraw_bet(
            env.contract.address,
            sender.unwrap(),
            Uint128(bet as u128),
        ));
    }

    if sender == state.player_b
        && state.player_b_wants_rematch
        && !state.player_a_wants_rematch
        && state.game_over
    {
        config(&mut deps.storage).update(|mut state| {
            state.player_b_wants_rematch = false;
            Ok(state)
        })?;
        return Ok(withdraw_bet(
            env.contract.address,
            sender.unwrap(),
            Uint128(bet as u128),
        ));
    }
    return Err(StdError::generic_err("Failed to withdraw"));
}

fn withdraw_bet(
    contract_address: HumanAddr,
    receiver: HumanAddr,
    amount: Uint128,
) -> HandleResponse {
    return HandleResponse {
        messages: vec![CosmosMsg::Bank(BankMsg::Send {
            from_address: contract_address,
            to_address: receiver,
            amount: vec![Coin {
                denom: "uscrt".to_string(),
                amount,
            }],
        })],
        log: vec![],
        data: None,
    };
}

pub fn try_rematch<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;
    let bet = state.bet;
    let sender = Some(env.message.sender.clone());

    if !state.game_over {
        return Err(StdError::generic_err("The game is not finished yet!"));
    }

    if state.player_a.is_none() || state.player_b.is_none() {
        return Err(StdError::generic_err("The game is not started yet!"));
    }

    if sender != state.player_a && sender != state.player_b {
        return Err(StdError::generic_err("You are not a player!"));
    }

    if (sender == state.player_a && state.player_a_wants_rematch)
        || (sender == state.player_b && state.player_b_wants_rematch)
    {
        return Err(StdError::generic_err(
            "You have already requested a rematch",
        ));
    }

    if env.message.sent_funds.len() == 0 {
        return Err(StdError::generic_err("Bet is required"));
    }
    if env.message.sent_funds[0].denom != "uscrt" {
        return Err(StdError::generic_err("Denom must be uscrt"));
    }
    if (env.message.sent_funds[0].amount.u128() as u64) < bet {
        return Err(StdError::generic_err("Insufficient amount sent"));
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

    let state = config_read(&deps.storage).load()?;

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
            state.player_a_timed_out = false;
            state.player_b_timed_out = false;
            state.last_action_timestamp = Some(env.block.time);
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
    secret: u64,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;
    let sender = Some(env.message.sender.clone());

    let mut seed = deps.storage.get(b"seed").unwrap();
    seed.extend(env.message.sender.to_string().as_bytes().to_vec());
    seed.extend(env.block.chain_id.as_bytes().to_vec());
    seed.extend(&env.block.height.to_be_bytes());
    seed.extend(&env.block.time.to_be_bytes());
    seed.extend(&secret.to_be_bytes());

    let new_seed: [u8; 32] = Sha256::digest(&seed).into();
    deps.storage.set(b"seed", &new_seed);

    if state.player_a.is_some() && state.player_b.is_some() {
        return Err(StdError::generic_err("Game is full!"));
    }

    if state.player_a == sender || state.player_b == sender {
        return Err(StdError::generic_err("You have already joined!"));
    }

    let bet = state.bet;

    if env.message.sent_funds.len() == 0 {
        return Err(StdError::generic_err("Bet is required"));
    }
    if env.message.sent_funds[0].denom != "uscrt" {
        return Err(StdError::generic_err("Denom must be uscrt"));
    }
    if (env.message.sent_funds[0].amount.u128() as u64) < bet {
        return Err(StdError::generic_err("Insufficient amount sent"));
    }

    if state.player_a.is_none() {
        config(&mut deps.storage).update(|mut state| {
            state.player_a = sender.clone();
            Ok(state)
        })?;

        return Ok(HandleResponse {
            messages: vec![],
            log: vec![],
            data: Some(to_binary("Successfully joined the game")?),
        });
    } else {
        let mut rng = ChaChaRng::from_seed(new_seed);
        let random = (rng.next_u32() % 25) as u8;
        config(&mut deps.storage).update(|mut state| {
            state.player_b = sender.clone();
            state.turn = sender;
            state.mine_index = Some(random);
            state.last_action_timestamp = Some(env.block.time);
            Ok(state)
        })?;
        return Ok(HandleResponse {
            messages: vec![],
            log: vec![],
            data: Some(to_binary("Successfully joined the game")?),
        });
    }
}

pub fn try_timeout<S: Storage, A: Api, Q: Querier>(
    deps: &mut Extern<S, A, Q>,
    env: Env,
) -> StdResult<HandleResponse> {
    let state = config_read(&deps.storage).load()?;

    if state.player_a.is_none() || state.player_b.is_none() {
        return Err(StdError::generic_err("The game is not started yet"));
    }
    if state.game_over {
        return Err(StdError::generic_err("The game is over"));
    }
    if state.last_action_timestamp.is_none() {
        return Err(StdError::generic_err("No timestamp of last action found"));
    }
    if env.block.time < (state.last_action_timestamp.unwrap() + state.timeout) {
        return Err(StdError::generic_err("Timeout has not been reached yet"));
    }

    let player_a = state.player_a.unwrap();
    let player_b = state.player_b.unwrap();
    let turn = state.turn.unwrap();

    let winner_addr = if turn == player_a {
        player_b.clone()
    } else {
        player_a.clone()
    };

    let player_a_timed_out: bool = winner_addr != player_a;

    config(&mut deps.storage).update(|mut state| {
        state.game_over = true;
        state.winner = Some(winner_addr.clone());
        state.player_a_timed_out = player_a_timed_out;
        state.player_b_timed_out = !player_a_timed_out;
        state.last_action_timestamp = None;
        Ok(state)
    })?;

    Ok(HandleResponse {
        messages: vec![CosmosMsg::Bank(BankMsg::Send {
            from_address: env.contract.address,
            to_address: winner_addr,
            amount: vec![Coin {
                denom: "uscrt".to_string(),
                amount: Uint128((state.bet * 2) as u128),
            }],
        })],
        log: vec![],
        data: Some(to_binary("Success")?),
    })
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

    if env.block.time > (state.last_action_timestamp.unwrap() + state.timeout) {
        return Err(StdError::generic_err("Timed out"));
    }

    let turn = if sender == state.player_a {
        state.player_b
    } else {
        state.player_a
    };

    if state.mine_index.unwrap() == index {
        let winner = turn.unwrap();
        let bet = state.bet;
        config(&mut deps.storage).update(|mut state| {
            state.board[index as usize] = 2;
            state.game_over = true;
            state.winner = Some(winner.clone());
            state.last_quess = Some(index);
            state.last_action_timestamp = None;
            Ok(state)
        })?;

        return Ok(HandleResponse {
            messages: vec![CosmosMsg::Bank(BankMsg::Send {
                from_address: env.contract.address,
                to_address: winner,
                amount: vec![Coin {
                    denom: "uscrt".to_string(),
                    amount: Uint128((bet * 2) as u128),
                }],
            })],
            log: vec![],
            data: Some(to_binary("Game over")?),
        });
    }

    config(&mut deps.storage).update(|mut state| {
        state.board[index as usize] = 1;
        state.last_quess = Some(index);
        state.turn = turn;
        state.last_action_timestamp = Some(env.block.time);
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
        player_a_wants_rematch: state.player_a_wants_rematch,
        player_b_wants_rematch: state.player_b_wants_rematch,
        turn: state.turn,
        bet: state.bet,
        player_a_timed_out: state.player_a_timed_out,
        player_b_timed_out: state.player_b_timed_out,
        timeout: state.timeout,
        last_action_timestamp: state.last_action_timestamp,
    })
}
