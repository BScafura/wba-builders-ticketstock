use anchor_lang::prelude::*;



#[account]
pub struct Ticket {
    pub maker: Pubkey,
    pub event_id: u64,
    pub purchase_date: u64,
    pub status: Status, 
    pub bump: u8,
}

impl Space for Ticket{
    const INIT_SPACE: usize = 8 + 32 + 8 + 8 + 1 + 1;

}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, Debug, PartialEq, Eq)]
pub enum Status{
    Used,
    Unusued,
}