use anchor_lang::prelude::*;


#[account]
pub struct Event {
    pub owner: Pubkey,
    pub name: String,
    pub description: String,
    pub price: u64,
    pub initial_date: u64,
    pub final_date: u64,
    pub category: Category, 
    pub avaliable_tickets: u16,
    pub seed: u64, //seed
    pub bump: u8,
}

impl Space for Event {
    const INIT_SPACE: usize = 8 + 32 + (32 + 4) + (32 + 4) + 8 + 8 + 8 + 1 + 2 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Category{
    Theater,
    Music,
    Sports,
}