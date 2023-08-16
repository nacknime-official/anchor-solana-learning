import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { expect } from "chai";
import { Calculator } from "../target/types/calculator";

async function setupCalculator(program: Program<Calculator>, initMessage: string, user: anchor.web3.PublicKey): Promise<anchor.web3.Keypair> {
  const calculator = anchor.web3.Keypair.generate();
  await program.methods.create(initMessage)
    .accounts({
      calculator: calculator.publicKey,
      user: user,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([calculator])
    .rpc();
  return calculator;
}

describe("calculator", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Calculator as Program<Calculator>;
  let calculator: anchor.web3.Keypair;

  before(async () => {
    calculator = await setupCalculator(program, "Welcome to Solana!", provider.wallet.publicKey);
  })

  it("Creates a calculator", async () => {
    const account = await program.account.calculator.fetch(calculator.publicKey);
    expect(account.greeting).to.equal("Welcome to Solana!");
  });

  it("Addition", async () => {
    await program.methods.add(new BN(1), new BN(2))
      .accounts({
        calculator: calculator.publicKey,
      })
      .rpc();

    const account = await program.account.calculator.fetch(calculator.publicKey);
    expect(account.result.toString()).to.equal(new BN(3).toString());
  })

  it("Substraction", async () => {
    await program.methods.sub(new BN(3), new BN(1))
      .accounts({
        calculator: calculator.publicKey,
      })
      .rpc()

    const account = await program.account.calculator.fetch(calculator.publicKey);
    expect(account.result.toString()).to.equal(new BN(2).toString());
  })

  it("Multiplication", async () => {
    await program.methods.mul(new BN(3), new BN(2))
      .accounts({
        calculator: calculator.publicKey,
      })
      .rpc();

    const account = await program.account.calculator.fetch(calculator.publicKey);
    expect(account.result.toString()).to.equal(new BN(6).toString());
  })

  it("Division", async () => {
    await program.methods.div(new BN(5), new BN(2))
      .accounts({
        calculator: calculator.publicKey,
      })
      .rpc();

    const account = await program.account.calculator.fetch(calculator.publicKey);
    expect(account.result.toString()).to.equal(new BN(2).toString());
    expect(account.remainder.toString()).to.equal(new BN(1).toString());
  })
});
