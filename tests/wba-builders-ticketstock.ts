import * as anchor from "@coral-xyz/anchor";
import { SystemProgram, Program, BN } from "@coral-xyz/anchor";
import { WbaBuildersTicketstock } from "../target/types/wba_builders_ticketstock";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, generateSigner, KeypairSigner, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs/promises"
import path from 'path';  
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { QRCode} from"../tests/qr-code"
import fs from 'fs-extra';
import { it } from "mocha";
import { findMasterEditionPda, findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";


describe("wba-builders-ticketstock", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  //Set the wallet
  const wallet = provider.wallet as NodeWallet;  
  // Set the provider
  const setProvider = anchor.setProvider(provider);
  //Get Provider
  const getProvider = anchor.getProvider(); 
  //Set connection
  const connection = getProvider.connection;
  //Set up the program
  const program = anchor.workspace.WbaBuildersTicketstock as anchor.Program<WbaBuildersTicketstock>;
  //Set up the System Program ID
  const SYSTEM_PROGRAM_ID = anchor.web3.SystemProgram.programId;
  //Set up the Token Program ID
  const TOKEN_PROGRAM_ID = new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");  
  //Set up the Token Metadata Program Id
  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

  const ASSOCIATED_TOKEN_PROGRAM_ID = new anchor.web3.PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
  //Metadata variables
  let testNFTTitle = "TicketStock Test";
  let testNFTDescription = "Test ticket for TicketStock";
  let testNFTSymbol = "TSTOCK";
  let testNFTUrl="";

  //Event Id
  let eventId = 1;
  let testEventId = new BN(eventId);


// Create UMI connection for localnet
const umi = createUmi(connection); // Local Solana cluster URL
let nftMint: KeypairSigner = generateSigner(umi);
const creatorWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
const signer = createSignerFromKeypair(umi, creatorWallet);
umi.use(irysUploader());
umi.use(signerIdentity(signer));
console.log(signer);

async function createUrl() {
  try {
    const assets = path.join('assets');
    await fs.ensureDir(assets);

    const file = path.join(assets, "qrcode.png");
    console.log(`Looking for QR code at: ${file}`);
    console.log(`File of type ${typeof(file)}`); 

    const imageFile = await readFile(file); // Certifique-se de que este caminho está correto
    console.log(`Reading file`);
    console.log(`File of type ${typeof(imageFile)}`); 
    

    // Check the minimum lamports to upload the QR code
    const fileSize = imageFile.length;  // get the size of the file in bytes
    const minRentExemptBalance = await connection.getMinimumBalanceForRentExemption(fileSize);
    console.log(`Minimum rent exempt balance required: ${minRentExemptBalance} lamports`);
  
    const umiImageFile = createGenericFile(imageFile, "Test Ticket!", { 
      tags: [{ name: "Content Type", value: "image/png" }],
      contentType: "image/png",  // Set contentType here
      extension: "png"           // Set extension here
    });
    console.log(`Creating a Generic File with: ${imageFile}`); 
    
    if (umiImageFile) {
      console.log(`Created: ${umiImageFile}`);
      console.log("UMI Image File:", umiImageFile); 
    } else {
      console.log(`Failed to created generic file!`); 
    }

    
    
    
    const imageUrl = await umi.uploader.upload([umiImageFile]).catch((err) =>{
      console.error(err);
      throw err;
  });;
    console.log("Uploading image and got URL using UMO");

    if (!imageUrl || imageUrl.length === 0) {
      throw new Error("Failed to upload image and get URL.");
    }

    const imageAddress = imageUrl[0];
    console.log("Your image URI: ", imageAddress);
    return imageAddress;
  } catch (error) {
    console.error("Oops.. Something went wrong:", error);
    return ""; // Retorne uma string vazia se houver erro
  }
}

// Derive PDA for the Ticket account
const [ticketPDA, ticketBump] =  anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("ticket"),
    new anchor.BN(testEventId).toArrayLike(Buffer, "le", 8),
  ],
  SYSTEM_PROGRAM_ID
);

// Derive PDA for the Ticket Mint account
const [ticketMintPDA, ticketMintBump] =  anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("ticketmint"),
    ticketPDA.toBuffer(),
  ],
  ASSOCIATED_TOKEN_PROGRAM_ID
);

// Derive the ATA for the ticket
const [ticketAtaPDA, ticketAtaBump] =  anchor.web3.PublicKey.findProgramAddressSync(
  [
    wallet.publicKey.toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    ticketMintPDA.toBuffer()
  ],
  ASSOCIATED_TOKEN_PROGRAM_ID
);

// Derive the metadata account address
const [metadataAddress, metadataBump] =  anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("metadata"),
    new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
    ticketMintPDA.toBuffer(),
  ],
  TOKEN_METADATA_PROGRAM_ID
);

// Derive the master edition account address
const [masterEditionAddress, masterEditionBump] =  anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("metadata"),
    new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
    ticketMintPDA.toBuffer(),
    Buffer.from("edition"),
  ],
  TOKEN_METADATA_PROGRAM_ID
);

it("Is initialized!", async () => {
    // Call the function to save the QR code image in the assets folder
    await QRCode();
    let eventId = 1;
    let testEventId = new BN(eventId);
   
    console.log(`Wallet: ${wallet.publicKey}`);
    console.log(`Ticket PDA: ${ticketPDA}`);
    console.log(`Ticket Mint PDA: ${ticketMintPDA}`);
    console.log(`ATA Address: ${ticketAtaPDA}`);
    console.log(`Metadata Address: ${metadataAddress}`);
    console.log(`Master Edition Address: ${masterEditionAddress}`);

    
     // Calculate the required balance
     // Calculate the required balance for the Ticket account
     const accountSize = 50; // Size of the Ticket struct
     const minBalance = await connection.getMinimumBalanceForRentExemption(accountSize + + 8 + 300); // 8 bytes for account header

     // Fund the ticket account
     let airdropSignature = await connection.requestAirdrop(wallet.publicKey, minBalance);
     await connection.confirmTransaction(airdropSignature);
    // Check balance
     const balance = await connection.getBalance(wallet.publicKey);
     console.log(`Wallet balance: ${balance} lamports`);
    
    //Create the URL using UMI
    let NFTUrl = await createUrl();

    // Verifique se o URL foi gerado corretamente
  if (!NFTUrl) {
    throw new Error("Failed to create NFT URL.");
  }

    testNFTUrl = NFTUrl.toString();
  });

  it("Intialize Ticket", async () => {
    
    const nftMetadata = findMetadataPda(umi, {mint: nftMint.publicKey});
    const nftEdition = findMasterEditionPda(umi, {mint: nftMint.publicKey});
    
    const tx = await program.methods.initialize(
      testEventId,
      testNFTUrl,
      testNFTSymbol,
      testNFTTitle,
    ).accountsPartial({
      maker: wallet.payer.publicKey,
      ticket: ticketPDA,
      systemProgram: SYSTEM_PROGRAM_ID,
      ticketMint: ticketMintPDA,
      tokenProgram: TOKEN_PROGRAM_ID,
      ticketAta: ticketAtaPDA,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      metadata: metadataAddress,
      masterEdition: masterEditionAddress,
      metadataProgram: TOKEN_METADATA_PROGRAM_ID,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    }).signers([]).rpc(); // No need for additional signers since the wallet's payer is the maker

  
  })
});

