import * as anchor from "@coral-xyz/anchor";
import { AnchorError, Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { expect } from "chai";
import { Giphy } from "../target/types/giphy";


describe("giphy", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  function programPaidBy(payer: anchor.web3.Keypair): anchor.Program {
    const newProvider = new anchor.AnchorProvider(provider.connection, new anchor.Wallet(payer), {});

    return new anchor.Program(program.idl as anchor.Idl, program.programId, newProvider)
  }

  const program = anchor.workspace.Giphy as Program<Giphy>;
  const user = provider.wallet.publicKey;
  const user2 = anchor.web3.Keypair.generate();
  const baseAccountKeypair = anchor.web3.Keypair.generate();

  before(async () => {
    await provider.connection.requestAirdrop(user2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
  })

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

  describe("Tip", () => {
    const tipAmount = 1 * anchor.web3.LAMPORTS_PER_SOL;
    const tipAmountBN = new BN(tipAmount)

    it("Ok", async () => {
      const initToBalance = await provider.connection.getBalance(user)

      await programPaidBy(user2).methods.tip(new BN(0), tipAmountBN)
        .accounts({
          baseGifAccount: baseAccountKeypair.publicKey,
          from: user2.publicKey,
          to: user,
        })
        .signers([user2])
        .rpc()

      const toBalance = await provider.connection.getBalance(user);
      expect(toBalance).to.equal(initToBalance + tipAmount);
    })

    it("Invalid 'to' account", async () => {
      try {
        await programPaidBy(user2).methods.tip(new BN(0), tipAmountBN)
          .accounts({
            baseGifAccount: baseAccountKeypair.publicKey,
            from: user2.publicKey,
            to: user2.publicKey, // wrong 'to'
          })
          .signers([user2])
          .rpc()
        chai.assert(false, "should've failed but didn't")

      } catch (_error) {
        expect(_error).to.be.instanceof(AnchorError)
        const error: AnchorError = _error

        expect(error.error.errorCode.number).to.equal(6000)
        expect(error.error.errorCode.code).to.equal("InvalidToAccountForTip")
      }
    })
  })
});
