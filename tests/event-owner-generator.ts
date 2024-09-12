import * as anchor from "@coral-xyz/anchor";

export async function createRandomPayer(provider: anchor.AnchorProvider, amount: number) {
  // Step 1: Generate a new random keypair
  const owner = anchor.web3.Keypair.generate();
  console.log("New Payer Public Key:", owner.publicKey.toString());

  // Step 2: Airdrop some SOL to the payer to cover transactions (this is for localnet/testnet)
  const airdropSignature = await provider.connection.requestAirdrop(
    owner.publicKey,
    amount * anchor.web3.LAMPORTS_PER_SOL // Airdrop the specified amount
  );

  // Wait for the airdrop transaction to be confirmed
  await provider.connection.confirmTransaction(airdropSignature);

  // Step 3: Check the balance to ensure the payer has funds
  const balance = await provider.connection.getBalance(owner.publicKey);
  console.log(`Payer's balance: ${balance} lamports`);

  // Now the payer can be used in transactions
  return owner;
}
