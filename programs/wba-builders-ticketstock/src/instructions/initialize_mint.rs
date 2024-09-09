use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token:: AssociatedToken, metadata::{create_master_edition_v3, create_metadata_accounts_v3, mpl_token_metadata, CreateMasterEditionV3, CreateMetadataAccountsV3, MasterEditionAccount, Metadata, MetadataAccount}, token::{mint_to, MintTo}, token_interface::{Mint, TokenAccount, TokenInterface}
};

use crate::state::{Status, Ticket};

#[derive(Accounts)]
#[instruction(event_id: u64)]
pub struct IssueTicket<'info> {
    // Signer ACCOUNT
    #[account(mut)]
    maker: Signer<'info>,

    // Ticket ACCOUNT
    #[account(
        init,
        payer = maker,
        space = Ticket::INIT_SPACE,
        seeds = [b"ticket", event_id.to_le_bytes().as_ref()],
        bump,
    )]
    ticket: Account<'info, Ticket>,
    system_program: Program<'info, System>,

    // Mint ACCOUNT
    #[account(
        init,
        seeds = [b"ticketmint", ticket.key().as_ref()],
        payer = maker,
        bump,
        mint::decimals = 6,
        mint::authority = ticket,
    )]
    ticket_mint: Box<InterfaceAccount<'info, Mint>>,
    token_program: Interface<'info, TokenInterface>,

    // ATA ACCOUNT
    #[account(
        init,
        payer = maker,
        associated_token::mint = ticket_mint,
        associated_token::authority = ticket,
    )]
    ticket_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    associated_token_program: Program<'info, AssociatedToken>,

    // Metadata ACCOUNT
    #[account(
        mut,
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            ticket_mint.key().as_ref(),
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    metadata: Box<Account<'info, MetadataAccount>>,

    // Master Edition ACCOUNT
    #[account(
        mut,
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            ticket_mint.key().as_ref(),
            b"edition",
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    master_edition: Box<Account<'info, MasterEditionAccount>>,

    metadata_program: Program<'info, Metadata>,
    rent: Sysvar<'info, Rent>
}

impl<'info> IssueTicket<'info> {
    pub fn initialize_tickets(&mut self,  event_id: u64, metadata_uri: String, metadata_symbol: String, metadata_title: String, bumps: &IssueTicketBumps) -> Result<()> {
        
        let uri = metadata_uri;
        let symbol = metadata_symbol;
        let title = metadata_title; 
        
        msg!("Creating ticket account...");
        //create ticket
        self.ticket.set_inner(Ticket{
            maker: self.maker.key(),
            event_id: event_id,
            purchase_date: Clock::get()?.slot,
            status: Status::Unusued, 
            bump: bumps.ticket,
        });
        msg!("Ticket: {}", self.ticket.key());  
        
        
        msg!("Minting to a Associated Token Account...");  
        //Mint to ticket_ata
        let accounts = MintTo {
            mint: self.ticket_mint.to_account_info(),
            to: self.ticket_ata.to_account_info(),
            authority: self.ticket.to_account_info(),
        };

        let seeds = &[
            &b"ticketmint"[..],
            &[bumps.ticket],
            &[bumps.ticket_mint],
        ];

        let signer_seeds = &[&seeds[..]];

        let ctx = CpiContext::new_with_signer(self.token_program.to_account_info(), accounts, signer_seeds);

        mint_to(ctx, 1)?;
        msg!("Mint: {}", self.ticket_mint.key());  
        msg!("ATA Account: {}", self.ticket_ata.key());  
        
        // create metadata account
        msg!("Creating Metadata Account...");  
         let cpi_context = CpiContext::new(
            self.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: self.metadata.to_account_info(),
                mint: self.ticket_mint.to_account_info(),
                mint_authority: self.ticket.to_account_info(),
                update_authority: self.ticket.to_account_info(),
                payer: self.maker.to_account_info(),
                system_program: self.system_program.to_account_info(),
                rent: self.rent.to_account_info(),
            },
        );

        let data_v2 = mpl_token_metadata::types::DataV2 {
            name: title.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        create_metadata_accounts_v3(cpi_context, data_v2, false, true, None)?;
        msg!("Metadata Account: {}", self.metadata.key());  

    
        //create master edition account
        msg!("Creating Master Edition Account...");
        let cpi_context = CpiContext::new(
        self.metadata_program.to_account_info(),
        CreateMasterEditionV3 {
            edition: self.master_edition.to_account_info(),
            mint: self.ticket_mint.to_account_info(),
            update_authority: self.ticket.to_account_info(),
            mint_authority: self.ticket.to_account_info(),
            payer: self.maker.to_account_info(),
            metadata: self.metadata.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            rent: self.rent.to_account_info(),
        },
        );
        create_master_edition_v3(cpi_context, Some(1))?;
        msg!("Master Edition Account: {}", self.master_edition.key());  
        Ok(())
            
}
}

