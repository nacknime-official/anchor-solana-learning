use anchor_lang::prelude::*;

declare_id!("EYTjQ8FAyTj8z8fvSnK8JMuVJSZXZXcCNXGPmN5ZdxxH");

#[program]
pub mod giphy {
    use anchor_lang::solana_program::entrypoint::ProgramResult;

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let base_gif_account = &mut ctx.accounts.base_gif_account;
        base_gif_account.total_gifs = 0;
        Ok(())
    }

    pub fn add_gif(ctx: Context<AddGif>, link: String) -> ProgramResult {
        let base_gif_account = &mut ctx.accounts.base_gif_account;
        let user = &ctx.accounts.user;

        let gif = Gif {
            link,
            user: user.to_account_info().key(),
        };
        base_gif_account.gif_list.push(gif);
        base_gif_account.total_gifs += 1;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer=user, space=9000)]
    pub base_gif_account: Account<'info, BaseGifAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddGif<'info> {
    #[account(mut)]
    pub base_gif_account: Account<'info, BaseGifAccount>,
    #[account()]
    pub user: Signer<'info>,
}

#[account]
pub struct BaseGifAccount {
    pub total_gifs: u64,
    pub gif_list: Vec<Gif>,
}
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct Gif {
    pub link: String,
    pub user: Pubkey,
}
