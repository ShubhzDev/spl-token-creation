use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Mint, TokenAccount, Transfer};

declare_id!("HD2Ya6ng1icMrKyxdB74xC5fbud2zYyFwieQcbtGQS3k");

#[program]
pub mod staking_program {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.token_vault = ctx.accounts.token_vault.key();
        pool.total_staked = 0;
        pool.apy = 5; // Set APY to 5%
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

    pub fn unstake(
        ctx: Context<Unstake>,
        amount: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let user_stake = &mut ctx.accounts.user_stake;
        let clock = Clock::get()?;

        require!(amount <= user_stake.amount, ErrorCode::InsufficientStake);

        // Calculate rewards based on the user's stake
        let rewards = calculate_rewards(
            user_stake.amount,
            user_stake.last_update,
            clock.unix_timestamp,
            pool.apy,
        );

        // Prepare to transfer tokens back to the user
        let seeds = &[
            pool.to_account_info().key.as_ref(),
            &[pool.bump],
        ];
        
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.token_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.pool_authority.to_account_info(),
                },
                signer,
            ),
            amount.checked_add(rewards).unwrap(),
        )?;

        // Update user's stake information after unstaking
        user_stake.amount = user_stake.amount.checked_sub(amount).unwrap();
        user_stake.last_update = clock.unix_timestamp;
        
        // Reset rewards after unstaking
        user_stake.rewards = 0;

        // Update total staked in the pool
        pool.total_staked = pool.total_staked.checked_sub(amount).unwrap();
        
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
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == token_mint.key(),
    )]
    pub user_token_account: Account<'info, TokenAccount>,

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

   #[account(mut)]
   pub pool: Account<'info, StakingPool>,

   /// CHECK: Pool authority PDA
   #[account(seeds = [pool.key().as_ref()], bump = pool.bump)]
   pub pool_authority: AccountInfo<'info>,

   #[account(mut)]
   pub token_vault: Account<'info, TokenAccount>,

   #[account(mut)]
   pub user_token_account: Account<'info, TokenAccount>,

   #[account(
       mut,
       seeds = [b"user_stake", pool.key().as_ref(), user.key().as_ref()],
       bump,
   )]
   pub user_stake: Account<'info, UserStake>,

   pub token_program: Program<'info, Token>,
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

#[error_code]
pub enum ErrorCode {
   #[msg("Insufficient stake amount")]
   InsufficientStake,
}