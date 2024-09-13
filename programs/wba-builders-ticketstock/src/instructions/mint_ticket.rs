use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token:: AssociatedToken, metadata::{create_master_edition_v3, create_metadata_accounts_v3, mpl_token_metadata, CreateMasterEditionV3, CreateMetadataAccountsV3, MasterEditionAccount, Metadata, MetadataAccount}, token::{mint_to, MintTo}, token_interface::{Mint, TokenAccount, TokenInterface}
};

use crate::{state::Ticket, Event};

#[derive(Accounts)]
#[instruction(seed: u64)]
pub struct IssueTicket<'info> {
    // Signer ACCOUNT
    #[account(mut)]
    maker: Signer<'info>,
    // Event ACCOUNT
    event_account: Account<'info, Event>,
     // Event ACCOUNT
    ticket_account: Account<'info, Ticket>,
    // Mint ACCOUNT
    #[account(
        init,
        seeds = [b"ticketmint", seed.to_le_bytes().as_ref()],
        payer = maker,
        bump,
        mint::decimals = 6,
        mint::authority = event_account,
    )]
    mint: Box<InterfaceAccount<'info, Mint>>,
    token_program: Interface<'info, TokenInterface>,

    // ATA ACCOUNT
    #[account(
        init,
        payer = maker,
        associated_token::mint = mint,
        associated_token::authority = event_account,
    )]
    mint_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    associated_token_program: Program<'info, AssociatedToken>,

    // Metadata ACCOUNT
    /// CHECK:
    #[account(
        mut,
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    metadata: UncheckedAccount<'info>,

    // Master Edition ACCOUNT
    /// CHECK:
    #[account(
        mut,
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            mint.key().as_ref(),
            b"edition",
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    master_edition: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
    metadata_program: Program<'info, Metadata>,
    rent: Sysvar<'info, Rent>
}

impl<'info> IssueTicket<'info> {
    pub fn mint_ticket(&mut self, metadata_uri: String, metadata_symbol: String, metadata_title: String, bumps: &IssueTicketBumps) -> Result<()> {
        
        let uri = metadata_uri;
        let symbol = metadata_symbol;
        let title = metadata_title; 
        
        msg!("Minting to a Associated Token Account...");  
        //Mint to ticket_ata
        let accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.mint_ata.to_account_info(),
            authority: self.event_account.to_account_info(),
        };

        //The seeds need to be the same seeds of the authority
        //let event_seed = self.event_account.seed.to_le_bytes();

        let seeds = &[
            b"event",
            &self.event_account.seed.to_le_bytes()[..],
            &[self.event_account.bump]
        ];

        let signer_seeds = &[&seeds[..]];

        let ctx = CpiContext::new_with_signer(self.token_program.to_account_info(), accounts, signer_seeds);

        mint_to(ctx, 1)?;
        msg!("Mint: {}", self.mint.key());  
        msg!("ATA Account: {}", self.mint_ata.key());  
        
        let seeds = &[
            b"event",
            &self.event_account.seed.to_le_bytes()[..],
            &[self.event_account.bump]
        ];
        let signer_seeds = &[&seeds[..]];

        // create metadata account
        msg!("Creating Metadata Account...");  
         let cpi_context = CpiContext::new_with_signer(
            self.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: self.metadata.to_account_info(),
                mint: self.mint.to_account_info(),
                mint_authority: self.event_account.to_account_info(),
                update_authority: self.event_account.to_account_info(),
                payer: self.maker.to_account_info(),
                system_program: self.system_program.to_account_info(),
                rent: self.rent.to_account_info(),
            }, signer_seeds);

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
        let seeds = &[
            b"event",
            &self.event_account.seed.to_le_bytes()[..],
            &[self.event_account.bump]
        ];
        let signer_seeds = &[&seeds[..]];

        msg!("Creating Master Edition Account...");
        let cpi_context = CpiContext::new_with_signer(
        self.metadata_program.to_account_info(),
        CreateMasterEditionV3 {
            edition: self.master_edition.to_account_info(),
            mint: self.mint.to_account_info(),
            update_authority: self.event_account.to_account_info(),
            mint_authority: self.event_account.to_account_info(),
            payer: self.maker.to_account_info(),
            metadata: self.metadata.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            rent: self.rent.to_account_info(),
        },signer_seeds
        );
        create_master_edition_v3(cpi_context, Some(1))?;
        msg!("Master Edition Account: {}", self.master_edition.key());  
        Ok(())
            
}
}

