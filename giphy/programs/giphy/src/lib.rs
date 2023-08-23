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
            rating: 0,
        };
        base_gif_account.gif_list.push(gif);
        base_gif_account.total_gifs += 1;

        Ok(())
    }

    pub fn upvote(ctx: Context<Upvote>, index: u64) -> ProgramResult {
        let base_gif_account = &mut ctx.accounts.base_gif_account;

        if let Some(gif) = base_gif_account.gif_list.get_mut(index as usize) {
            gif.rating += 1;
        }

        Ok(())
    }

    pub fn tip(ctx: Context<Tip>, index: u64, amount: u64) -> Result<()> {
        let base_gif_account = &ctx.accounts.base_gif_account;
        let from = &mut ctx.accounts.from;
        let to = &mut ctx.accounts.to;

        if let Some(gif) = base_gif_account.gif_list.get(index as usize) {
            if gif.user != to.key() {
                return err!(GiphyError::InvalidToAccountForTip);
            }
        }

        let ix =
            anchor_lang::solana_program::system_instruction::transfer(from.key, to.key, amount);
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[from.to_account_info(), to.to_account_info()],
        )?;

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

#[derive(Accounts)]
pub struct Upvote<'info> {
    #[account(mut)]
    pub base_gif_account: Account<'info, BaseGifAccount>,
}

#[derive(Accounts)]
pub struct Tip<'info> {
    #[account()]
    pub base_gif_account: Account<'info, BaseGifAccount>,
    #[account(mut)]
    pub from: Signer<'info>,
    #[account(mut)]
    /// CHECK: for transfer
    pub to: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
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
    pub rating: i64,
}

#[error_code]
pub enum GiphyError {
    InvalidToAccountForTip,
}
