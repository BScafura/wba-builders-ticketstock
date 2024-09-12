use anchor_lang::prelude::*;
use crate::{state::Ticket, Event, Status};

#[derive(Accounts)]
#[instruction(seed: u64)]
 pub struct TicketAccount<'info>{
 // Signer ACCOUNT
 #[account(mut)]
    user: Signer<'info>,
 // Event ACCOUNT
 event_account: Account<'info, Event>,
 // Ticket ACCOUNT
 #[account(
    init,
    payer = user,
    space = Ticket::INIT_SPACE,
    seeds = [b"ticket", event_account.key().as_ref(), seed.to_le_bytes().as_ref()],
    bump,
)]
ticket_account: Account<'info, Ticket>,
system_program: Program<'info, System>,

 }
 
 impl<'info>TicketAccount<'info> {
    pub fn initialize_ticket(&mut self, seed: u64, bumps: &TicketAccountBumps) -> Result<()> {
        msg!("Creating ticket account...");
        //create ticket
        self.ticket_account.set_inner(Ticket{
            maker: self.user.key(),
            event: self.event_account.key(),
            seed: seed,
            purchase_date: Clock::get()?.slot,
            status: Status::Unusued, 
            bump: bumps.ticket_account,
        });
        msg!("Ticket: {}", self.ticket_account.key());  
        Ok(())
    }

 }