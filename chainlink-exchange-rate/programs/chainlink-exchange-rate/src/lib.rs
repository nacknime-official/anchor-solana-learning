use anchor_lang::prelude::*;
use chainlink_solana as chainlink;

declare_id!("DJN8BQuEbEwxPnpJYvsnGWJPb2oF2BzJaQg8ENu66sy1");

#[program]
pub mod chainlink_exchange_rate {
    use super::*;

    pub fn execute(ctx: Context<Execute>) -> Result<()> {
        let round = chainlink::latest_round_data(
            ctx.accounts.chainlink_program.to_account_info(),
            ctx.accounts.chainlink_feed.to_account_info(),
        );
        let result_account = &mut ctx.accounts.result_account;

        result_account.value = round?.answer;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(init, payer=user, space=100)]
    pub result_account: Account<'info, ResultAccount>,

    /// CHECK: Chainlink program
    #[account()]
    pub chainlink_program: AccountInfo<'info>,

    /// CHECK: Chainlink feed
    #[account()]
    pub chainlink_feed: AccountInfo<'info>,

    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ResultAccount {
    pub value: i128,
}
