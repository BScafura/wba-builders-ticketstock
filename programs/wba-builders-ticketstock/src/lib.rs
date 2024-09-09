pub mod state;
pub mod instructions;

pub use instructions::*;
pub use state::*;   

use anchor_lang::prelude::*;

declare_id!("3HDmQAKY2wVXPEMmmQKFrDnvMw2reAAuvH5Bp715CbBe");

#[program]
pub mod wba_builders_ticketstock {
    

    use instructions::IssueTicket;

    use super::*;

    pub fn initialize(ctx: Context<IssueTicket>, event_id: u64, metadata_uri: String, metadata_symbol: String, metadata_title: String) -> Result<()> {
        ctx.accounts.initialize_tickets(event_id, metadata_uri, metadata_symbol, metadata_title, &ctx.bumps)?;

       


        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
