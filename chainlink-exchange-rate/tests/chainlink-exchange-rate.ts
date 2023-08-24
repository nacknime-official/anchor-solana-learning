import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { ChainlinkExchangeRate } from "../target/types/chainlink_exchange_rate";

const CHAINLINK_PROGRAM = "HEvSKofvBgfaexv23kMabbYqxasxU3mQ4ibBMEmJWHny"
const CHAINLINK_FEED = "99B2bTijsU6f1GCT73HmdR7HCFFjGMBcPZY6jZ96ynrR"

describe("chainlink-exchange-rate", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.ChainlinkExchangeRate as Program<ChainlinkExchangeRate>;

  it("Queries the Chainlink SOL/USD feed", async () => {
    const resultAccountKeypair = anchor.web3.Keypair.generate()

    await program.methods.execute()
      .accounts({
        resultAccount: resultAccountKeypair.publicKey,

        chainlinkProgram: CHAINLINK_PROGRAM,
        chainlinkFeed: CHAINLINK_FEED,

        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([resultAccountKeypair])
      .rpc();

    const resultAccount = await program.account.resultAccount.fetch(resultAccountKeypair.publicKey);
    console.log(resultAccount.value.toNumber() / 100000000)
  });
});
