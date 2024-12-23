use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;

declare_id!("DDqtf1nGhbkndVh8Vc8RqCPj3dimz9YkrJCjJzxxRqrs");

pub mod constants{
    pub const VAULT_SEED : &[u8] = b"token_vault";
}

#[program]
pub mod staking_program {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        // Derive PDA and get bump
        let (_pda, bump) = Pubkey::find_program_address(
            &[b"staking_pool", ctx.accounts.token_mint.key().as_ref()],
            ctx.program_id,
        );

        // Initialize pool account
        pool.authority = ctx.accounts.authority.key();
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.token_vault = ctx.accounts.token_vault.key();
        pool.total_staked = 0;
        pool.apy = 5; // Set APY to 5%
        pool.bump = bump; // Set the bump field

        Ok(())
    }

    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        // Transfer tokens from the user's account to the token vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_token_account.to_account_info(),
                    to: ctx.accounts.token_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update user stake information
        let user_stake = &mut ctx.accounts.user_stake;
        user_stake.user = ctx.accounts.user.key();
        user_stake.pool = pool.key();
        user_stake.amount = amount;
        user_stake.last_update = clock.unix_timestamp;
        user_stake.rewards = 0;

        // Update total staked in the pool
        pool.total_staked = pool.total_staked.checked_add(amount).unwrap();
        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        let clock = Clock::get()?;

        // Check if the user has sufficient stake
        require!(
            amount <= ctx.accounts.user_stake.amount,
            ErrorCode::InsufficientStake
        );

        // Calculate rewards
        let rewards = calculate_rewards(
            ctx.accounts.user_stake.amount,
            ctx.accounts.user_stake.last_update,
            clock.unix_timestamp,
            ctx.accounts.pool.apy,
        );

        // Prepare seeds for PDA signing
        let pool_seeds = &[
            b"staking_pool",
            ctx.accounts.token_mint.to_account_info().key.as_ref(),
            &[ctx.accounts.pool.bump],
        ];
        let pool_signer = &[&pool_seeds[..]];

        // Transfer tokens from vault to user
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                pool_signer,
            ),
            amount.checked_add(rewards).unwrap(),
        )?;

        // Update user stake information
        ctx.accounts.user_stake.amount = ctx.accounts.user_stake.amount.checked_sub(amount).unwrap();
        ctx.accounts.user_stake.last_update = clock.unix_timestamp;
        ctx.accounts.user_stake.rewards = 0;

        // Update pool total staked
        ctx.accounts.pool.total_staked = ctx.accounts.pool.total_staked.checked_sub(amount).unwrap();

        Ok(())
    }

    pub fn close_pool(ctx: Context<ClosePool>) -> Result<()> {
        let pool = &ctx.accounts.pool;

        // Ensure the caller is the authority of the pool
        require_keys_eq!(pool.authority, ctx.accounts.authority.key(), ErrorCode::Unauthorized);

        // Ensure the pool has no remaining staked tokens
        require!(pool.total_staked == 0, ErrorCode::PoolNotEmpty);

        // Transfer any remaining tokens in the vault to the authority
        let seeds = &[
            pool.to_account_info().key.as_ref(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        let remaining_tokens = ctx.accounts.token_vault.amount;
        if remaining_tokens > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.token_vault.to_account_info(),
                        to: ctx.accounts.authority_token_account.to_account_info(),
                        authority: ctx.accounts.pool_authority.to_account_info(),
                    },
                    signer,
                ),
                remaining_tokens,
            )?;
        }

        // Close the token vault account
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::CloseAccount {
                    account: ctx.accounts.token_vault.to_account_info(),
                    destination: ctx.accounts.authority.to_account_info(),
                    authority: ctx.accounts.pool_authority.to_account_info(),
                },
                signer,
            ),
        )?;

        Ok(())
    }


}

    pub fn calculate_rewards(
        amount: u64,
        last_update: i64,
        current_time: i64,
        apy: u8,
    ) -> u64 {
        // Calculate the duration in seconds since the last update
        let duration = current_time - last_update;

        // Convert APY from percentage to a decimal
        let apy_decimal = apy as f64 / 100.0;

        // Calculate rewards based on the formula:
        // rewards = (amount * apy_decimal / seconds_in_a_year) * duration
        let seconds_in_a_year = 31_536_000.0; // Approximate seconds in a year
        
         // Check for negative duration
         if duration < 0 {
             return 0; // No rewards if duration is negative
         }

         let rewards = (amount as f64 * apy_decimal / seconds_in_a_year) * duration as f64;

         // Return rewards as a u64
         rewards.round() as u64
    }

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + StakingPool::LEN,
        seeds = [b"staking_pool", token_mint.key().as_ref()],
        bump,
    )]
    pub pool: Account<'info, StakingPool>,
   
    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = pool,
        seeds = [b"token_vault", token_mint.key().as_ref()],
        bump
    )]
    pub token_vault: Account<'info, TokenAccount>,
   
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"staking_pool", token_mint.key().as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, StakingPool>,
    

    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"token_vault", token_mint.key().as_ref()],
        bump,
    )]
    pub token_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        associated_token::mint=token_mint,
        associated_token::authority=user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    pub associated_token_program : Program<'info,AssociatedToken>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserStake::LEN,
        seeds = [b"user_stake", pool.key().as_ref(), user.key().as_ref()],
        bump,
    )]
    pub user_stake: Account<'info, UserStake>,
    

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
   #[account(mut)]
   pub user: Signer<'info>,

   #[account(mut,
       seeds = [b"staking_pool", token_mint.key().as_ref()],
       bump = pool.bump,
   )]
   pub pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"token_vault", token_mint.key().as_ref()],
        bump
    )]
    pub token_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint=token_mint,
        associated_token::authority=user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

   #[account(
       mut,
       seeds = [b"user_stake", pool.key().as_ref(), user.key().as_ref()],
       bump,
   )]
   pub user_stake: Account<'info, UserStake>,

   pub token_program: Program<'info, Token>,

   pub token_mint: Account<'info, Mint>,

}

#[account]
pub struct StakingPool {
   pub authority: Pubkey,
   pub token_mint: Pubkey,
   pub token_vault: Pubkey,
   pub bump: u8,
   pub total_staked: u64,
   pub apy: u8,
}

#[account]
pub struct UserStake {
   pub user: Pubkey,
   pub pool: Pubkey,
   pub amount: u64,
   pub last_update: i64,
   pub rewards: u64,
}

impl StakingPool {
   pub const LEN: usize = 32 + 32 + 32 + 1 + 8 + 1; // Sizes of fields in StakingPool
}

impl UserStake {
   pub const LEN: usize = 32 + 32 + 8 + 8 + 8; // Sizes of fields in UserStake
}

#[derive(Accounts)]
pub struct ClosePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>, // Pool authority

    #[account(mut, close = authority)]
    pub pool: Account<'info, StakingPool>, // Staking pool account to be closed

    /// CHECK: Pool authority PDA
    #[account(seeds = [pool.key().as_ref()], bump = pool.bump)]
    pub pool_authority: AccountInfo<'info>, // PDA for the pool authority

    #[account(mut)]
    pub token_vault: Account<'info, TokenAccount>, // Token vault to be closed

    #[account(mut)]
    pub authority_token_account: Account<'info, TokenAccount>, // Authority's token account for remaining tokens

    pub token_program: Program<'info, Token>, // SPL Token program
}


#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient stake amount")]
    InsufficientStake,
    #[msg("Unauthorized operation")]
    Unauthorized,
    #[msg("Pool is not empty")]
    PoolNotEmpty,
}
