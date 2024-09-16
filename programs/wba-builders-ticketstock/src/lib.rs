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

    pub fn initialize_event(ctx: Context<NewEvent>,  seed: u64, name: String, description: String, price: u64, final_date:u64, category: Category, avaliable_tickets: u16) -> Result <()>{
        ctx.accounts.initialize_event(seed, name, description, price, final_date, category, avaliable_tickets, &ctx.bumps)
    }    
    
    pub fn initialize_ticket(ctx: Context<TicketAccount>,seed:u64) -> Result<()> {
        ctx.accounts.initialize_ticket(seed, &ctx.bumps)
    }

    pub fn mint_ticket(ctx: Context<IssueTicket>, seed: u64, metadata_uri: String, metadata_symbol: String, metadata_title: String) -> Result<()> {
        ctx.accounts.mint_ticket( seed, metadata_uri, metadata_symbol, metadata_title, &ctx.bumps)
    }
}
