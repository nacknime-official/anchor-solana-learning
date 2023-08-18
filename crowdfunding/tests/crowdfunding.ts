import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";
import { Crowdfunding } from "../target/types/crowdfunding";

async function createCampaign(program: Program<Crowdfunding>, name: string, description: string, user: anchor.web3.PublicKey): Promise<anchor.web3.PublicKey> {
  const [campaign] = anchor.web3.PublicKey.findProgramAddressSync([
    anchor.utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
    user.toBytes(),
    anchor.utils.bytes.utf8.encode(name),
  ], program.programId);

  const res = await program.methods.create(name, description)
    .accounts({
      campaign: campaign,
      user: user,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpcAndKeys()

  return res.pubkeys.campaign;
}

describe("crowdfunding", () => {
  const provider = anchor.AnchorProvider.env();
  provider.opts.commitment = "confirmed"
  anchor.setProvider(provider);

  const user = provider.wallet.publicKey;
  const program = anchor.workspace.Crowdfunding as Program<Crowdfunding>;


  it("Creates a campaign", async () => {
    const name = "test1";
    const description = "test desc";
    const campaignPubKey = await createCampaign(program, name, description, user);

    const campaign = await program.account.campaign.fetch(campaignPubKey);

    expect(campaign.name).to.eq(name);
    expect(campaign.description).to.eq(description);
    expect(campaign.admin.toString()).to.eq(user.toString());
    expect(campaign.amountDonated.toString()).to.eq(new anchor.BN(0).toString());
  });

  it("Donates to a campaign", async () => {
    const campaignPubKey = await createCampaign(program, "test donate", "test donate", user);

    const donateAmount = 0.2 * anchor.web3.LAMPORTS_PER_SOL;
    const donateAmountBN = new anchor.BN(donateAmount)
    const initialUserBalance = await provider.connection.getBalance(user);

    const txSig = await program.methods.donate(donateAmountBN)
      .accounts({
        campaign: campaignPubKey,
        user: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc()
    const tx = await provider.connection.getParsedTransaction(txSig, "confirmed");

    const campaign = await program.account.campaign.fetch(campaignPubKey);
    const campaignBalance = await provider.connection.getBalance(campaignPubKey);
    const userBalance = await provider.connection.getBalance(user);

    expect(campaign.amountDonated.toString()).to.eq(donateAmountBN.toString());
    expect(userBalance).to.eq(initialUserBalance - donateAmount - tx.meta.fee);
    expect(campaignBalance).to.gte(donateAmount);
  })

  // TODO: cover case when not admin doing a withdraw
  it("Withdraw from a campaign", async () => {
    const campaignPubKey = await createCampaign(program, "test withdraw", "test withdraw", user);

    // donate
    const donateAmount = 0.2 * anchor.web3.LAMPORTS_PER_SOL;
    const donateAmountBN = new anchor.BN(donateAmount)

    await program.methods.donate(donateAmountBN)
      .accounts({
        campaign: campaignPubKey,
        user: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    // withdraw
    const withdrawAmount = 0.1 * anchor.web3.LAMPORTS_PER_SOL;
    const withdrawAmountBN = new anchor.BN(withdrawAmount);
    const initialCampaignBalance = await provider.connection.getBalance(campaignPubKey);
    const initialUserBalance = await provider.connection.getBalance(user);

    const txSig = await program.methods.withdraw(withdrawAmountBN)
      .accounts({
        campaign: campaignPubKey,
        user: user,
      })
      .rpc();
    const tx = await provider.connection.getParsedTransaction(txSig, "confirmed");
    const campaignBalance = await provider.connection.getBalance(campaignPubKey);
    const userBalance = await provider.connection.getBalance(user);

    // expect
    expect(campaignBalance).to.eq(initialCampaignBalance - withdrawAmount);
    expect(userBalance).to.eq(initialUserBalance + withdrawAmount - tx.meta.fee);
  })
});
