import walletUmi from "../tests/wallet.json"
import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { WbaBuildersTicketstock } from "../target/types/wba_builders_ticketstock";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, generateSigner, keypairIdentity, KeypairSigner, percentAmount, publicKey, PublicKey, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"
import { readFile } from "fs/promises"
import path from 'path';  
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { QRCode} from"../tests/qr-code"
import fs from 'fs-extra';
import { it } from "mocha";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, createMint, getAssociatedTokenAddressSync} from "@solana/spl-token";
import { createMetadataAccountV3, CreateMetadataAccountV3InstructionAccounts, CreateMetadataAccountV3InstructionArgs, createNft, createV1, DataV2Args, findMasterEditionPda, findMetadataPda, mplTokenMetadata, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import{createRandomPayer} from "../tests/event-owner-generator"
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import base58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";



describe("wba-builders-ticketstock", () => {
  
  //################################## Provider, Wallet and Programs##################################

  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  //Set the wallet
  const wallet = provider.wallet as NodeWallet;  
  //Get Provider
  const getProvider = anchor.getProvider(); 
  //Set connection
  const connection = getProvider.connection;
  //Set up the program
  const program = anchor.workspace.WbaBuildersTicketstock as Program<WbaBuildersTicketstock>;
  
  //Set up the Token Metadata Program Id
  const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");


//############################################### Seeds #################################################

  //Seeds
  let seed = 1;
  let pdaSeed = new BN(seed)
  
//###################################### Accounts, EventId and Seeds #####################################

  //Derive PDA for Event Account
  const [event, _eventBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("event"), new anchor.BN(seed).toArrayLike(Buffer, "le", 8)],  // 8-byte little-endian buffer
    program.programId
  );

    //Derive PDA for Ticket Account
  const [ticket, _ticketBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("ticket"), 
      event.toBuffer(),
      new anchor.BN(seed).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

  // Derive PDA for the Ticket Mint account
const ticketMintPDA =  anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("ticketmint"),
    pdaSeed.toBuffer(),
  ],
  SYSTEM_PROGRAM_ID 
)[0];

// Derive the metadata account address
const metadataAddress =  anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("metadata"),
    new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
    ticketMintPDA.toBuffer(),
  ],
  TOKEN_METADATA_PROGRAM_ID
)[0];

// Derive the master edition account address
const masterEditionAddress=  anchor.web3.PublicKey.findProgramAddressSync(
  [
    Buffer.from("metadata"),
    new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
    ticketMintPDA.toBuffer(),
    Buffer.from("edition"),
  ],
  TOKEN_METADATA_PROGRAM_ID
)[0];

// Derive the ATA for the ticket
const ticketMintAta = getAssociatedTokenAddressSync(ticketMintPDA, provider.wallet.publicKey);

//############################################### UMI ###############################################

// Create UMI connection for localnet
const umi = createUmi('https://api.devnet.solana.com'); // Devnet for URI creation
const umiLocal = createUmi(provider.connection); // Local Solana cluster URL
const creatorWallet = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(walletUmi));
const signer = createSignerFromKeypair(umi, creatorWallet);
umi.use(irysUploader());
umi.use(signerIdentity(signer));
console.log(signer);


// Create a random keypair signer for the mint account using UMI
let nftMint: KeypairSigner = generateSigner(umi);



//Verify Adress
console.log(`Wallet: ${wallet.publicKey}`);
console.log(`Ticket PDA: ${ticket}`);
console.log(`Event PDA: ${event}`);
console.log(`Ticket Mint PDA: ${ticketMintPDA}`);
console.log(`ATA Address: ${ticketMintAta}`);
console.log(`Metadata Address: ${metadataAddress}`);
console.log(`Master Edition Address: ${masterEditionAddress}`);


//######################################## FUNCTIONS ################################
// Create image uri function
async function createUri() {
  try {
    const assets = path.join('assets');
    await fs.ensureDir(assets);

    const file = path.join(assets, "qrcode.png");
    console.log(`Looking for QR code at: ${file}`);
    console.log(`File of type ${typeof(file)}`); 

    const imageFile = await readFile(file);
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
    console.log("Your image URL: ", imageAddress);
    return imageAddress;
  } catch (error) {
    console.error("Oops.. Something went wrong:", error);
    return ""; // Retorne uma string vazia se houver erro
  }
}
// Create QR uri function
async function imageUri() {
      // Call the function to save the QR code image in the assets folder
      await QRCode();   
      // Calculate the required balance
      // Calculate the required balance for the Ticket account
      const accountSize = 50; // Size of the Ticket struct
      const minBalance = await connection.getMinimumBalanceForRentExemption(accountSize + + 8 + 300); // 8 bytes for account header
 
      // Fund the ticket account
      let airdropSignature = await connection.requestAirdrop(wallet.payer.publicKey, minBalance);
      await connection.confirmTransaction(airdropSignature);
     // Check balance
      const balance = await connection.getBalance(wallet.payer.publicKey);
      console.log(`Wallet balance: ${balance} lamports`);
     
     //Create the URL using UMI
     let NFTUri = await createUri();
 
     // Verifique se o URL foi gerado corretamente
   if (!NFTUri) {
     throw new Error("Failed to create NFT URL.");
   }
 
     NFTUri = NFTUri.toString();
     return NFTUri;
}

// Create Metadata uri function
async function MetadataUri(){
  let imageUriUrl = await imageUri() 
  const creatorWalletLocal = umiLocal.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
  const creatorLocal = createSignerFromKeypair(umiLocal, creatorWalletLocal);
  umiLocal.use(mplTokenMetadata());
  umiLocal.use(keypairIdentity(creatorLocal));
  // Define metadata
   const metadata = {
    name: "Test NFT",
    symbol: "TSTOCK",
    description: "This is a test metadata",
    image: imageUriUrl,
    attributes: [
        { trait_type: 'Background', value: 'Blue' },
        { trait_type: 'Eyes', value: 'Green' }
    ],
    properties: {
        files: [
            {
                type: "image/png",
                uri: imageUriUrl
            },
        ]
    },
    creators: [
        {
            address: creatorLocal.publicKey.toString(),
            share: 100
        }
    ]
};
console.log("This is your metadata data", metadata);

// Convert metadata to a GenericFile object
const metadataJsonString = JSON.stringify(metadata);
const metadataArray = new Uint8Array(Buffer.from(metadataJsonString));
const metadataFile = createGenericFile(metadataArray, "metadata.json");

// Upload metadata as an array
const metadataUris = await umi.uploader.upload([metadataFile]); // Pass as an array
const metadataUri = metadataUris[0]; // Access the first URI in the array


//Your metadata URI:  https://arweave.net/mz1m2q9gmEQIYIc7Dm9_BILxC7Ppjjn19a5m4_Do1Is
console.log("Your metadata URI: ", metadataUri);
return metadataUri
}

async function splInit() {
  const keypair = Keypair.fromSecretKey(new Uint8Array(wallet.payer.secretKey));

  try {
    // Parameters Connection, Mint, Mint Authority, Freeze Authority and Decimals
    // The program ID is by Default call the SPL Token Account 
    const mint = await createMint(connection, keypair, keypair.publicKey, null, 6);
    // Wallets, Mints, accounts are Base58 
    console.log("Mint created:", mint.toBase58());
    return mint.toBase58();
} catch(error) {
    console.log(`Oops, something went wrong: ${error}`)
    return null;
}
  
}
async function createSplMetadata(){
    //Creating a MetadataAccount (that is a PDA)
    let mint =  publicKey(await splInit());
    let uri = await MetadataUri();
    const umiLocal = createUmi(provider.connection); // Local Solana cluster URL
    const creatorWalletLocal =  umiLocal.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
    const creatorLocal = createSignerFromKeypair(umiLocal, creatorWalletLocal);
    umiLocal.use(signerIdentity(createSignerFromKeypair(umiLocal, creatorLocal)));
    
    let accounts: CreateMetadataAccountV3InstructionAccounts = {
    mint: mint,
    mintAuthority: creatorLocal,
    };

    let data: DataV2Args = {
        name: "Ticket Stock Test",
        symbol: "TSTOCK",
        uri: uri, // can be a empty string
        creators: null,
        collection: null,
        uses: null,
        sellerFeeBasisPoints: 1,

    };

    let args: CreateMetadataAccountV3InstructionArgs = {
        data,
        isMutable: true,
        collectionDetails: null,

    };

    let tx =  createMetadataAccountV3(
         umiLocal,
        {
            ...accounts,
            ...args
        }
     );
     let result = await tx.sendAndConfirm(umiLocal);
     console.log(bs58.encode(result.signature));
}
//################################################# TESTS #################################################

it("Should initialize an Mint Adress and a Metadata Adress", async() => {
  createSplMetadata()

});  

it("Should create nftImage URI", async () => {
  try {
    // Call the function to save the QR code image in the assets folder
     await QRCode();   
     // Calculate the required balance
     // Calculate the required balance for the Ticket account
     const accountSize = 50; // Size of the Ticket struct
     const minBalance = await connection.getMinimumBalanceForRentExemption(accountSize + + 8 + 300); // 8 bytes for account header

     // Fund the ticket account
     let airdropSignature = await connection.requestAirdrop(wallet.payer.publicKey, minBalance);
     await connection.confirmTransaction(airdropSignature);
    // Check balance
     const balance = await connection.getBalance(wallet.payer.publicKey);
     console.log(`Wallet balance: ${balance} lamports`);
    
    //Create the URL using UMI
    let NFTUri = await createUri();

    // Verifique se o URL foi gerado corretamente
  if (!NFTUri) {
    throw new Error("Failed to create NFT URL.");
  }

    NFTUri = NFTUri.toString();
    
  } catch (error) {
    console.log(error);
  }  
  
  });

it("Should initialize and event account", async () => {
  let owner = await createRandomPayer(provider, 200); 
  
  let price = new BN(100); 
  let finalDate = new BN(1234567890);
  let category = { theater: {} };
  let name = "Test Event"
  const description = "This is a test event"
  const avalieableTickets = 100
  
  
    const tx = await program.methods.initializeEvent(new BN(1), "Test Event" , "This is a test event" , new BN(100), new BN(1234567890), { theater: {} }, 100)
    .accountsPartial({
      owner: owner.publicKey,  
      eventAccount: event,
      systemProgram: SYSTEM_PROGRAM_ID,
    })
    .signers([owner])
    .rpc();
  
  console.log("Initialized event with transaction signature:", tx);
 


});

it("Should initialize a ticket account", async () => {  

  const tx = await program.methods.initializeTicket(pdaSeed)
.accountsPartial({
  user: provider.wallet.publicKey,
  eventAccount: event,
  ticketAccount: ticket,
  systemProgram: SYSTEM_PROGRAM_ID,
})
.rpc();

 console.log("Initialized ticket with transaction signature:", tx);


})

it("Should create the metadata URI", async () => {
    const creatorWalletLocal = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
    const creatorLocal = createSignerFromKeypair(umiLocal, creatorWalletLocal);
    umiLocal.use(mplTokenMetadata());
    umiLocal.use(keypairIdentity(creatorLocal));
    let imageUriUrl = imageUri() 
    // Define metadata
     const metadata = {
      name: "Test NFT",
      symbol: "TSTOCK",
      description: "This is a test metadata",
      image: imageUriUrl,
      attributes: [
          { trait_type: 'Background', value: 'Blue' },
          { trait_type: 'Eyes', value: 'Green' }
      ],
      properties: {
          files: [
              {
                  type: "image/png",
                  uri: imageUriUrl
              },
          ]
      },
      creators: [
          {
              address: creatorLocal.publicKey.toString(),
              share: 100
          }
      ]
  };
  console.log("This is your metadata address", metadata);
  });

it("Should create an NFT", async () => {
    const uri = await MetadataUri();
    const nftMint: KeypairSigner = generateSigner(umiLocal);
    const creatorWalletLocal = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet.payer.secretKey));
    const creatorLocal = createSignerFromKeypair(umiLocal, creatorWalletLocal);
    umiLocal.use(mplTokenMetadata());
    umiLocal.use(keypairIdentity(creatorLocal));
    // Create a NFT Transaction, setting the name, URI, and seller fee basis points. createNft is a method from @metaplex-foundation/mpl-token-metadata lib
     let tx = createNft(umiLocal, {
      mint: nftMint,
      name: "Ticket Test",
      symbol: "TStock",
      uri: uri,
      sellerFeeBasisPoints: percentAmount(1),
      collection: null,
      creators: null,
  }).sendAndConfirm(umiLocal)
  
  //Mint Address 
  console.log("Mint Address: ", nftMint.publicKey);
  
  })

it("Mint ticket", async () => {
    //const mintAta = getAssociatedTokenAddressSync(new anchor.web3.PublicKey(nftMint.publicKey as PublicKey), provider.wallet.publicKey);
    let metadataUri = await MetadataUri();
    //const nftMetadata = findMetadataPda(umi, {mint: nftMint.publicKey});
    //const nftEdition = findMasterEditionPda(umi, {mint: nftMint.publicKey});
      const tx =  await program.methods.mintTicket(metadataUri, "TSTOCK", "TicketStock Test").accountsPartial({
        maker: provider.wallet.publicKey,
        eventAccount: event,
        ticketAccount: ticket,
        mint: ticketMintPDA,
        systemProgram: SYSTEM_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        mintAta: ticketMintAta,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        metadata: metadataAddress,
        masterEdition: masterEditionAddress,
        metadataProgram: TOKEN_METADATA_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      }).rpc(); 

      console.log("Ticket minted with transaction signature:", tx);

  
  })
});

