import './App.css';
import idl from './idl.json'
import { useEffect, useState } from 'react';
import { clusterApiUrl, Connection, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, BN, Program, utils, web3 } from '@coral-xyz/anchor';

window.Buffer = window.Buffer || require("buffer").Buffer;

const programId = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed"
}

function App() {
  const [walletAddress, setWalletAddress] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new AnchorProvider(connection, window.solana, opts.preflightCommitment);
    return provider;
  }

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");

          const response = await solana.connect({
            onlyIfTrusted: true,
          });

          console.log("Connected with pubkey:", response.publicKey.toString());
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom wallet");
      }
    } catch (error) {
      console.error(error);
    }
  }

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log("Connected with pubkey:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const createCampaign = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      const [campaign] = PublicKey.findProgramAddressSync([
        utils.bytes.utf8.encode("CAMPAIGN_DEMO"),
        provider.wallet.publicKey.toBytes(),
        "campaign name",
      ], program.programId);

      await program.methods.create("campaign name", "campaign description").accounts({
        campaign: campaign,
        user: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      }).rpc();

      console.log("Created a campaign: ", campaign.toString());
    } catch (error) {
      console.log("Error on creating a campaign: ", error);
    }
  }

  const getCampaigns = async () => {
    const provider = getProvider();
    const program = new Program(idl, programId, provider);
    Promise.all(
      (await provider.connection.getProgramAccounts(programId)).map(
        async campaign => ({
          ...(await program.account.campaign.fetch(campaign.pubkey)),
          pubkey: campaign.pubkey,
          balance: campaign.account.lamports,
        })
      )
    ).then(campaigns => setCampaigns(campaigns));
  }

  const donate = async (publicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.methods.donate(new BN(0.2 * web3.LAMPORTS_PER_SOL))
        .accounts({
          campaign: publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        }).rpc();
      await getCampaigns();
      console.log("Donated successfully!")
    } catch (error) {
      console.error("Error on donate: ", error);
    }
  }

  const withdraw = async (publicKey) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.methods.withdraw(new BN(0.2 * web3.LAMPORTS_PER_SOL))
        .accounts({
          campaign: publicKey,
          user: provider.wallet.publicKey,
        }).rpc();
      await getCampaigns();
      console.log("Withdrew successfully!")
    } catch (error) {
      console.error("Error on withdraw: ", error);
    }
  }

  const renderNotConnectedContainer = () => (
    <button onClick={connectWallet}>Connect to wallet</button>
  );
  const renderConnectedContainer = () => (
    <>
      <button onClick={createCampaign}>Create a campaign</button>
      <button onClick={getCampaigns}>Get a list of campaigns</button>
      <br />
      {campaigns.map((campaign) => (
        <>
          <hr />
          <p>Campaign ID: {campaign.pubkey.toString()}</p>
          <p>Balance: {(campaign.balance / web3.LAMPORTS_PER_SOL).toString()}</p>
          <p>Amount donated: {(campaign.amountDonated / web3.LAMPORTS_PER_SOL).toString()}</p>
          <p>{campaign.name}</p>
          <p>{campaign.description}</p>
          <p>Admin: {campaign.admin.toString()}</p>
          <button onClick={() => donate(campaign.pubkey)}>Donate 0.2</button>
          <button onClick={() => withdraw(campaign.pubkey)}>Withdraw 0.2</button>
        </>
      ))}
    </>
  )

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);

    return () => window.removeEventListener('load', onLoad);
  });

  return <div className="App">
    {!walletAddress && renderNotConnectedContainer()},
    {walletAddress && renderConnectedContainer()}
  </div>;
}

export default App;
