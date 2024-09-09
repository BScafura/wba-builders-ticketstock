use anchor_lang::prelude::*;
use crate::state::{Category, Event};


#[derive(Accounts)]
#[instruction(id: u64)] //Name of the event passed by as a parameter
pub struct NewEvent<'info>{
    //Owner account
    #[account(mut)]
    owner: Signer<'info>,
    //Event account
    #[account(
        init,
        payer = owner,
        space = Event::INIT_SPACE,
        seeds = [b"event", id.to_le_bytes().as_ref()], //Using name as seed to create a unique seed
        bump,
    )]
    event: Account<'info, Event>,
    //System Account 
    system_program: Program<'info, System>,
}

impl<'info> NewEvent<'info> {
    pub fn initialize_event(&mut self, id: u64, name: String, description: String, price: u64, final_date:u64, category: Category, avaliable_tickets: u16, bumps: &NewEventBumps) -> Result<()>{
        
        self.event.set_inner(Event{
            owner: self.owner.key(),
            name,
            description,
            price,
            initial_date: Clock::get()?.slot,
            final_date,
            category,
            avaliable_tickets,
            id,
            bump: bumps.event,
        });    
        Ok(())
    }



}