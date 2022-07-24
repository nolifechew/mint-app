import "./css/style.css";
import { useState, useEffect, useCallback } from "react";
import { providerOptions } from "./providerOptions";
import Web3Modal from "web3modal";
import { ethers } from "ethers";
import Web3 from 'web3';

import MetaMaskOnboarding from '@metamask/onboarding'

import {MerkleTree} from "merkletreejs";

const keccak256 = require("keccak256");



// Config
const { 

	yugenABI,
	yugenAddress,
	testYugenABI,
	testYugenAddress
	
}  = require('./values/config');

function App() {

  const [merkleTree, setMerkleTree] = useState(null);
  const [whitelistObject, setWhitelistObject] = useState(null);

  const [btnText, setBtnText] = useState("");
  const [isDisabled, setDisabled] = useState(false)
  const [metaMaskInstalled, setMetaMaskInstalled] = useState("")
  const [walletAddress, setWallet] = useState("");
  const [amountToMint, setAmountToMint] = useState(0);
  const [whitelistPrice, setWhitelistPrice] = useState(0);
  const [mintPassPrice, setMintPassPrice] = useState(0);
  const [publicPrice, setPublicPrice] = useState(0);

  const [isPublicMint, setIsPublicMint] = useState(0);

  const [web3Object, setWeb3] = useState(null);

  const [yugen, setYugen] = useState(null);

  const [mintingObject, setMintingObject] = useState(null);

  //TODO: set the max amount based on whitelists
  const [maxAmount, setMaxAmount] = useState(5);


  const onboarding = new MetaMaskOnboarding();

  const { ethereum } = window;


  const initDapp = async () => {
    
    generateMerkleTree();
    // Check whether MetaMask is installed
    MetaMaskClientCheck();
        
    if (isMetaMaskInstalled()) {
      // Get current wallet connected (useful after refresh of page and used to display in the button that you are already connected)
      const { address } = await getCurrentWalletConnected(); 
      setWallet(address);

      // Add wallet listener to handle account changes by the user
      addWalletListener();


    }

    
  };

  useEffect(() => {
    initDapp();
  }, []);

  // Check whether MetaMask Chrome extension is installed
  const isMetaMaskInstalled = () => {
    const isInstalled = Boolean(ethereum && ethereum.isMetaMask);
    setMetaMaskInstalled(isInstalled);
    return isInstalled;
  };

  //TODO: add this in
  const setPrices = async () => {

    if(yugen == null) {
      return;
    }

    setPublicPrice(await yugen.methods.price().call());
    setWhitelistPrice(await yugen.methods.whitelistPrice().call());
    setMintPassPrice(await yugen.methods.mintpassPrice().call());

  }

  function getHexProof(address, type) {

    if(address in whitelistObject == false || type in whitelistObject[address] == false) {
      console.log("no proof");
      return false;
    }
  
    const amount = whitelistObject[address][type];
  
    const hashedLeaf = keccak256(ethers.utils.solidityPack(["address", "uint256", "uint256"], [address, type, amount]));
  
    
    return {"proof" : merkleTree.getHexProof(hashedLeaf), "maxAmount" : amount };
  
  }
  
  function getAllProofs(address) {
  
    let result = {}
  
    for(let i = 0; i < 3; i++) {
  
      result[i] = getHexProof(address, i);
    }
  
    return result;
  
  }

  // Aux function for isMetaMaskInstalled function
  const MetaMaskClientCheck = () => {
      if (!isMetaMaskInstalled()) {
          setBtnText("Install Metamask");
          console.log("Hello")
      } else {
          setBtnText("Connect");
      }
  };

  const setupWeb3 = async () => {

    let web = new Web3(window.ethereum);

    setWeb3(web);

    let yugenObject = new web.eth.Contract(yugenABI, yugenAddress)

    setYugen(yugenObject);

    setPrices();



    //TODO: uncomment when ready
    getWhitelistAmounts();



  }

  // Executed on page load. When an account is already connected, then it will display the corresponding account in the button text
  const getCurrentWalletConnected = async () => {
    if (ethereum) {
      try {
        const addressArray = await ethereum.request({
          method: "eth_accounts",
        });
        if (addressArray.length > 0) {
            setBtnText(addressFormatter(addressArray[0]));
            setDisabled(true);
            
            setupWeb3();

            return {
              address: addressArray[0],
            };
        } else {
            return {
              address: "",
            };
        }
      } catch (error) {
          console.error(error);
          return {
              address: "",
          };
      }
    } else {
        return {
            address: "",
        };
    }
  }

  const onClickConnect = async () => {
    try {
        // Disable button when clicked
        setDisabled(true);

        // Note: This part will trigger the MetaMask pop-up if you are either logged out of your wallet or logged in but not connected to any account. 
        // There won't be a pop-up window if you are already connected with an account
        const addressArray = await ethereum.request({ method: 'eth_requestAccounts' });

        console.log(addressArray);
        
        if (addressArray.length > 0) {
            setWallet(addressArray[0])
            setBtnText(addressFormatter(addressArray[0]))
            setupWeb3();
            return {
              address: addressArray[0],
            };
          } else {
              setBtnText("No account connected")
            return {
              address: "",
            };
          };
    } catch (error) { // Wwhen user rejects the request
        setDisabled(false);                       
        console.error(error);
        return {
            address: ""
        };
    }
  };

  async function getWhitelistAmounts() {

    let obj = {};

    if(walletAddress == "") return;

    if(walletAddress in whitelistObject == false) return;

    const walletObject = whitelistObject[walletAddress];

    let max = 0;

    for(let i = 0; i < 3; i++) {

      const str = i.toString();

      if(str in walletObject == false) continue;

      const amount = walletObject[str];

      let amountMinted = 0;

      if(i == 1) {
        amountMinted = await yugen.methods.MintPassUsed(walletAddress).call();
      } else if(i == 2) {
        amountMinted = await yugen.methods.FreeMinted(walletAddress).call();
      }

      let proof = getHexProof(walletAddress, i);

      if(i == 0) {
        max = 20;
      } else {
        max += (amount - amountMinted);
      }

      obj[i] = {maxAmount : amount, amountMinted : amountMinted, proof: proof};

    }

    if(isPublicMint) max = 20;

    setMaxAmount(max);
    setMintingObject(obj);
    

  }

  // Wallet listener to handle accounts changes by the user
  function addWalletListener() {
    if (ethereum) {
      ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWallet(accounts[0]);
          setBtnText(addressFormatter(accounts[0]))

        } else {
          setWallet("");
          setBtnText("Connect");
          setDisabled(false);
          setMaxAmount(0);
        }
      });
    } else {
      setWallet("");
      setBtnText("No window.ethereum object found");
    }
  }

  const Mint = async () => {

    if(walletAddress == "") return;
    if(mintingObject == null) return;

    let types = [];

    let maxAmounts = [];

    let amounts = [];

    let proofs = [];

    let amountLeftToMint = amountToMint;

    let price = 0;
    
    for(let i = 1; i <= 2; i++) {

      if(amountLeftToMint == 0) {
        break;
      }

      if(i in mintingObject) {

        const obj = mintingObject[i];

        const leftOfType = obj.maxAmount - obj.amountMinted;

        if(leftOfType > 0) {

          amounts.push(leftOfType);
          maxAmounts.push(obj.maxAmount);
          proofs.push(obj.proof);
          types.push(i);

          amountLeftToMint -= leftOfType;

          let typePrice = 0;

          if(i == 1) {
            typePrice = mintPassPrice;
          }

          price += (typePrice * leftOfType)

        }

      }

    }

    if(amountLeftToMint > 0) {

      if(0 in mintingObject) {

        //has whitelist
        const obj = mintingObject[0];
        amounts.push(amountLeftToMint);
        maxAmounts.push(obj.maxAmount);
        proofs.push(obj.proof);
        types.push(0);

        price += (whitelistPrice * amountLeftToMint);


      }


    }

    if(price > 0) {

      await yugen.methods.whitelistMint(proofs, amounts, types, maxAmounts).send({value : price});

    } else if(isPublicMint) {

      price = (amountLeftToMint * publicPrice);

      await yugen.methods.publicMint(amountLeftToMint).send({value : price});


    }
  
    //TODO: text
  
  }

  // Converts any given account address into the following format: 0x1234...6789
  const addressFormatter = (account) => {
    return (
        "Connected: " +
        String(account).substring(0, 6) +
        "..." +
        String(account).substring(38)
    )          
  }  


  const generateMerkleTree = async () => {

    const whitelistObject = require("./values/whitelist.json");

    let leafArray = []

    const addresses = Object.keys(whitelistObject);

    for (let i = 0; i < addresses.length; i++) {
        const address = addresses[i];

        const addressObject = whitelistObject[address];

        for(let j = 0; j < 3; j++) {

            if(j in addressObject) {

                let obj = {"address" : address, "type" : j, "maxAmount" : addressObject[j]}
                
                leafArray.push(obj)

            }

        }

    }

    const leafNodes = leafArray.map(leaf => {

        let hash = keccak256(ethers.utils.solidityPack(["address", "uint256", "uint256"], [leaf.address, leaf.type, leaf.maxAmount]));
        
        return hash;
        
    });

    let _merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});

    const merkleTreeRoot = await _merkleTree.getHexRoot();

    console.log("hexroot: ", merkleTreeRoot);

    setMerkleTree(_merkleTree);

    setWhitelistObject(whitelistObject)

  } 


  return (
    <div className="App">

<div className="wrapper">
  
  <header className="header">
    <a href="index.html" className="header-logo"></a>
    <div className="menu-toggle">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div className="header-menu">
      <div className="header-socials">
        <a href="https://twitter.com/Yugennft" target="_blank"><img src="img/ico_twiter.svg" alt=""></img></a>
        <a href="http://www.discord.gg/yugencity" target="_blank"><img src="img/ico_discord.svg" alt=""></img></a>
        
      </div>
      <ul className="header-nav">
        <li className="glitch-hover"><a href="index.html#promo" className="glitching" data-text="Home">Home</a></li>
        <li className="glitch-hover"><a href="index.html#club" className="glitching" data-text="Cyber City">Cyber City</a></li>
        <li className="glitch-hover"><a href="index.html#rinen" className="glitching" data-text="Tao">Tao</a></li>
        <li className="glitch-hover"><a href="index.html#strategy" className="glitching" data-text="Story">Story</a></li>
        <li className="glitch-hover"><a href="index.html#team" className="glitching" data-text="Team">Team</a></li>
        <li className="glitch-hover"><a href="index.html#faq" className="glitching" data-text="FAQ">FAQ</a></li>
        <li className="glitch-hover"><a href=".mint" className="go_to glitching" data-text="mint">mint</a></li>
      </ul>
    </div>
  </header>

  <section className="mint">
    <div className="mint-bg"></div>
    <div className="container">
      <div className="mint-inner">
        <div className="mint-decor-1"></div>
        <div className="mint-content-decor"></div>
        <div className="mint-content">
          <div className="mint-content-bg"></div>
          <h2 className="mint-title glitched" data-text="Mint YUGEN">Mint YUGEN</h2>
          <p className="mint-text">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est.</p>
          <form action="" className="mint-form">
            <h3 className="mint-form__total">0 eth</h3>
            <p className="mint-form__text"><span id = "mint-form_text_left">Generated text</span> <span id = "mint-form_text_left">Generated text</span></p>
            <div className="mint-form__calc">
              <button className="mint-form__minus" onClick={
                () => {

                  console.log("plus");
                  if(amountToMint - 1 < 0) {
                    return;
                  }

                  setAmountToMint(amountToMint - 1);
                }
              }></button>
              <div className="mint-form__count">
                <input type="number" value={amountToMint} id="mintAmount"></input>
              </div>
              <button className="mint-form__plus" onClick={ () => {

                console.log("plus");
                if(amountToMint + 1 > maxAmount) {
                  return;
                }

                setAmountToMint(amountToMint + 1);

              }
                
              }></button>
            </div>
            <button className="mint-form__button" onClick={walletAddress == "" ? onClickConnect : Mint}>{btnText}</button>
          </form>
        </div>
      </div>
    </div>
  </section>

  <footer className="footer">
    <div className="footer-bg"></div>
    <div className="container">
      <div className="footer-socials">
        <a href="https://twitter.com/Yugennft" target="_blank"><img src="img/ico_twiter-2.svg" alt="social"></img></a>
        <a href="http://www.discord.gg/yugencity" target="_blank"><img src="img/ico_discord-2.svg" alt="social"></img></a>
       
      <p className="footer-copy">Copyright © 2022</p>
    </div>
    </div>
  </footer>
  
</div>

<script type="text/javascript" src="js/jquery-3.1.0.min.js"></script>
<script type="text/javascript" src="js/slick.min.js"></script>
<script data-main="js/scripts" src="scripts/require.js"></script>


</div>
  );
}

export default App;
