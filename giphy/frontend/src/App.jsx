import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import idl from "./idl.json";
import { Buffer } from "buffer";
import gifAccount from "./gif_account.json"
import { BN } from 'bn.js';

window.Buffer = window.Buffer || Buffer;

const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const programId = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed"
}

let baseGifAccount = Keypair.fromSecretKey(Uint8Array.from(gifAccount));

const App = () => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

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
  }

  const sendGif = async () => {
    if (inputValue.length) {
      try {
        const provider = getProvider();
        const program = new Program(idl, programId, provider);

        await program.methods.addGif(inputValue)
          .accounts({
            baseGifAccount: baseGifAccount.publicKey,
            user: provider.wallet.publicKey,
          })
          .rpc();

        await getGifList();
      } catch (error) {
        console.error(error)
      }
      setInputValue('')
    } else {
      console.log("Empty input value");
    }
  }

  const onInputChange = event => {
    const { value } = event.target;
    setInputValue(value);
  }

  const upvote = async index => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.methods.upvote(new BN(index))
        .accounts({
          baseGifAccount: baseGifAccount.publicKey,
        })
        .rpc()
      await getGifList()
    } catch (error) {
      console.error(error)
    }
  }

  const tip = async (index, to) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.methods.tip(new BN(index), new BN(0.1 * LAMPORTS_PER_SOL))
        .accounts({
          baseGifAccount: baseGifAccount.publicKey,
          from: provider.wallet.publicKey,
          to: to,
        })
        .rpc()
      alert(`Successfully tipped to ${to.toString()}`)
    } catch (error) {
      console.error(error)
    }
  }

  const renderNotConnectedContainer = () => (
    <button className='cta-button connect-wallet-button' onClick={connectWallet}>Connect to Wallet</button>
  )

  const renderConnectedContainer = () => {
    if (gifList === null) {
      return (
        <div className='connected-container'>
          <button className='cta-button submit-gif-button' onClick={createGifAccount}>Do One-Time Initialization for GIF Program Account</button>
        </div>
      )
    } else {
      return (
        <div className='connected-container'>

          <form onSubmit={event => {
            event.preventDefault();
            sendGif();
          }}>
            <input type='text' placeholder='Enter gif link!' value={inputValue} onChange={onInputChange} />
            <button type='submit' className='cta-button submit-gif-button'>Submit</button>
          </form>

          <div className='gif-grid'>
            {gifList.map((gif, index) => (
              <div className='gif-item' key={index}>
                <img src={gif.link} alt={gif.link} />
                <button onClick={() => upvote(index)}>Rating UP ({gif.rating.toString()})</button>
                <button onClick={() => tip(index, gif.user)}>Tip 0.1 SOL</button>
              </div>
            ))}
          </div>
        </div>
      )
    }
  }

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    }
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, [])

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);

      await program.methods.initialize()
        .accounts({
          baseGifAccount: baseGifAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([baseGifAccount])
        .rpc()
      console.log("gif account has been created: ", baseGifAccount.publicKey.toString());
      await getGifList();
    } catch (error) {
      console.log(error)
    }
  }

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programId, provider);
      const account = await program.account.baseGifAccount.fetch(baseGifAccount.publicKey);

      setGifList(account.gifList);
    } catch (error) {
      console.log(error)
      setGifList(null);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log("fetch gif list...");
      getGifList()
    }
  }, [walletAddress])

  return (
    <div className="App">
      <div className={walletAddress ? 'authed-container' : "container"}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {!walletAddress && renderNotConnectedContainer()}
          {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`Adapted from @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
