import "./css/style.css";
import { useState, useEffect } from "react";
//import { providerOptions } from "./providerOptions";
//import Web3Modal from "web3modal";
import { ethers } from "ethers";
import Web3 from 'web3';

import {MerkleTree} from "merkletreejs";

const keccak256 = require("keccak256");



// Config
const { 

	yugenABI,
	yugenAddress,
	testYugenABI,
	testYugenAddress
	
}  = require('./values/config');

const whitelistObject = require("./values/whitelist.json");
let merkleTree;
let yugen;
let connectedWallet = "";
let mintingObject;
let publicPrice = 0;
let whitelistPrice = 0;
let mintPassPrice = 0;

//TODO: change this
const isTestNet = true;

function App() {

  // const [merkleTree, setMerkleTree] = useState(null);

  const [btnText, setBtnText] = useState("");
  const [isDisabled, setDisabled] = useState(false)
  //const [metaMaskInstalled, setMetaMaskInstalled] = useState("")
  const [walletAddress, setWallet] = useState("");
  const [amountToMint, setAmountToMint] = useState(0);

  

  const [isPublicMint, setIsPublicMint] = useState(0);


  //TODO: set the max amount based on whitelists
  const [maxAmount, setMaxAmount] = useState(0);

  const [mintCost, setMintCost] = useState(0);

  const [whitelistText, setWhitelistText] = useState("");

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check whether MetaMask Chrome extension is installed
  const isMetaMaskInstalled = () => {
    const isInstalled = Boolean(ethereum && ethereum.isMetaMask);
    //setMetaMaskInstalled(isInstalled);
    return isInstalled;
  };

  const setPrices = async () => {

    publicPrice = await yugen.methods.price().call();

    whitelistPrice = await yugen.methods.whitelistPrice().call();

    mintPassPrice = await yugen.methods.mintPassPrice().call();

  }

  function getHexProof(address, type) {

    if(address in whitelistObject === false || type in whitelistObject[address] === false) {
      console.log("no proof");
      return false;
    }
  
    const amount = whitelistObject[address][type];
  
    const hashedLeaf = keccak256(ethers.utils.solidityPack(["address", "uint256", "uint256"], [address, type, amount]));
  
    
    return {"proof" : merkleTree.getHexProof(hashedLeaf), "maxAmount" : amount };
  
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

    web.eth.net.getNetworkType()
    .then((result) => {
      
      console.log("network type = ", result);
    });

    let yugenObject;

    if(isTestNet) {
      yugenObject = new web.eth.Contract(testYugenABI, testYugenAddress)
    } else {
      yugenObject = new web.eth.Contract(yugenABI, yugenAddress)
    }

    yugen = yugenObject;

    await setPrices();

    getWhitelistAmounts();

    getText();

    getIsPublicMint(yugenObject);


  }

  const getIsPublicMint = async (yugenObject) => {

    const isPub = await yugenObject.methods.isPublicMint().call();

    setIsPublicMint(isPub);

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
            connectedWallet = addressArray[0]

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
        // Note: This part will trigger the MetaMask pop-up if you are either logged out of your wallet or logged in but not connected to any account. 
        // There won't be a pop-up window if you are already connected with an account
        const addressArray = await ethereum.request({ method: 'eth_requestAccounts' });

        console.log(addressArray);
        
        if (addressArray.length > 0) {
            setWallet(addressArray[0])
            setBtnText(addressFormatter(addressArray[0]))
            setupWeb3();
            connectedWallet = addressArray[0];
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

  const getPrice = (_amountToMint) => {

    let price = 0;

    let amountLeftToMint = _amountToMint;

    if(mintingObject !== null) {
    
      for(let i = 1; i <= 2; i++) {

        if(amountLeftToMint === 0) {
          break;
        }

        if(i in mintingObject) {

          const obj = mintingObject[i];

          const leftOfType = obj.maxAmount - obj.amountMinted;

          if(leftOfType > 0) {

            amountLeftToMint -= leftOfType;

            let typePrice = 0;

            if(i === 1) {
              typePrice = mintPassPrice;
            }

            price += (typePrice * leftOfType)

          }

        }

      }

      if(amountLeftToMint > 0) {

        if(0 in mintingObject) {

          //has whitelist
          price += (whitelistPrice * amountLeftToMint);
          amountLeftToMint = 0;


        }
      }

    }

    if(amountLeftToMint > 0 && isPublicMint) {

      price += (amountLeftToMint * publicPrice);

    }

    let etherValue = ethers.utils.formatEther(price.toString());

    console.log("ether value = ", etherValue);

    etherValue = parseFloat(etherValue);

    console.log("ether value = ", etherValue);

    setMintCost(etherValue);

  }

  async function getWhitelistAmounts() {

    let obj = {};

    

    if(connectedWallet === "") {
      console.log("wallet address is none")
    };

    console.log("wallet = ", connectedWallet);

    if(connectedWallet in whitelistObject === false) {

      console.log("not in whitelist");

      if(isPublicMint) {

        setMaxAmount(20);

      }

    } else {

      console.log("in whitelist object");

    }

    const walletObject = whitelistObject[connectedWallet];

    let max = 0;

    for(let i = 0; i < 3; i++) {

      const str = i.toString();

      if(str in walletObject === false) continue;

      const amount = walletObject[str];

      let amountMinted = 0;

      if(i === 1) {
        amountMinted = await yugen.methods.MintPassUsed(connectedWallet).call();
      } else if(i === 2) {
        amountMinted = await yugen.methods.FreeMinted(connectedWallet).call();
      }

      let proof = getHexProof(connectedWallet, i);

      if(i === 0) {
        max = 20;
      } else {
        max += (amount - amountMinted);
      }

      obj[i] = {maxAmount : amount, amountMinted : amountMinted, proof: proof};

    }

    if(isPublicMint) max = 20;

    setMaxAmount(max);
    mintingObject = obj;
    
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

    if(walletAddress === "") return;
    if(mintingObject == null) return;

    let types = [];

    let maxAmounts = [];

    let amounts = [];

    let proofs = [];

    let amountLeftToMint = amountToMint;

    let price = 0;
    
    for(let i = 1; i <= 2; i++) {

      if(amountLeftToMint === 0) {
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

          if(i === 1) {
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

  const getText = () => {

    let text = "";

    for(let i = 1; i <= 2; i++) {

      if(i in whitelistObject === false) continue;

      const obj = whitelistObject[i];

      const numLeftToMint = obj.maxAmount - obj.amountMinted;

      if(numLeftToMint <= 0) continue;

      if(text.length > 0) {
        text += ", "
      }

      if(i === 1) {

        text += "Key Pass Mints: ";

      } else {
        text += "Free Mints: ";
      }

      text += amountToMint.toString();

    }

    if(0 in whitelistObject) {

      if(text.length > 0) {
        text += ", "
      }

      text += "Whitelist Mints: Unlimited";

    } else if(isPublicMint) {

      if(text.length > 0) {
        text += ", "
      }

      text += "Public Mints: Unlimited";

    }

    setWhitelistText(text);

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

    merkleTree = _merkleTree;

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
          <p className="mint-text">Mint instructions:
                  Connect to MetaMask wallet by selecting the button. 
                  Once connected, input the amount of Citizens you’d like to mint.

                  For holders of the Keys of Cyber City, you will be able to mint up to the maximum amount of Citizens depending on how many of each Key is held in the wallet. If your wallet is also Whitelisted, you may then move on to Whitelist minting.

                  Once the Whitelist phase is over, any wallet may mint a Citizen and enter Cyber City!

                  Max Mint Amounts:
                  Per Stable Key: 3
                  Per Ionized Key: 2
                  Whitelist and Public: Unlimited</p>
          <form action="" className="mint-form">
            <h3 className="mint-form__total">{mintCost > 0 ? mintCost.toFixed(2) + " Eth" : "0 Eth"}</h3>

            { whitelistText.length > 0 && (
              <p className="mint-form__text">{whitelistText}</p>
            )}
            <div className="mint-form__calc">
              <button className="mint-form__minus" onClick={
                () => {

                  console.log("minus");
                  if(amountToMint - 1 < 0) {
                    return;
                  }

                  setAmountToMint(amountToMint - 1);
                  getPrice(amountToMint - 1);
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
                getPrice(amountToMint + 1);

              }
                
              }></button>
            </div>
            <button className="mint-form__button" onClick={isDisabled ? null : walletAddress === "" ? onClickConnect : Mint}>{btnText}</button>
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
