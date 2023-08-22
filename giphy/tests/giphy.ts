import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { expect } from "chai";
import { Giphy } from "../target/types/giphy";

describe("giphy", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Giphy as Program<Giphy>;
  const user = provider.wallet.publicKey;
  const baseAccountKeypair = anchor.web3.Keypair.generate();

  it("Is initialized!", async () => {
    await program.methods.initialize()
      .accounts({
        baseGifAccount: baseAccountKeypair.publicKey,
        user: user,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([baseAccountKeypair])
      .rpc();

    const baseAccount = await program.account.baseGifAccount.fetch(baseAccountKeypair.publicKey);

    expect(baseAccount.totalGifs.toNumber()).to.equal(0);
  });

  it("Adds gif", async () => {
    const gifLink = "https://media.giphy.com/media/DeahLFiIbWYrC/giphy.gif"
    await program.methods.addGif(gifLink)
      .accounts({
        baseGifAccount: baseAccountKeypair.publicKey,
        user: user,
      })
      .rpc()

    const baseAccount = await program.account.baseGifAccount.fetch(baseAccountKeypair.publicKey);

    expect(baseAccount.totalGifs.toNumber()).to.eq(1);
    expect(baseAccount.gifList).to.deep.equal([{ link: gifLink, user: user, rating: new BN(0) }]);
  })

  it("Upvote", async () => {
    const initBaseAccount = await program.account.baseGifAccount.fetch(baseAccountKeypair.publicKey);
    const initRating = initBaseAccount.gifList[0].rating;

    await program.methods.upvote(new BN(0))
      .accounts({
        baseGifAccount: baseAccountKeypair.publicKey,
      })
      .rpc()
    const baseAccount = await program.account.baseGifAccount.fetch(baseAccountKeypair.publicKey);

    expect(baseAccount.gifList[0].rating.toNumber()).to.equal(initRating.toNumber() + 1);
  })
});
