import "./css/style.css";
import { useState, useEffect } from "react";
//import { providerOptions } from "./providerOptions";
//import Web3Modal from "web3modal";
import { ethers } from "ethers";
import Web3 from 'web3';

import {MerkleTree} from "merkletreejs";

import twitterimg from "./img/ico_twitter.svg";
import discordimg from "./img/ico_discord.svg";
import twitter2img from "./img/ico_twitter-2.svg";
import discord2img from "./img/ico_discord-2.svg";

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

  const [btnText, setBtnText] = useState("");
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
      connectedWallet = address;

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

    await getWhitelistAmounts();

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
            setBtnText("Mint");
            //setDisabled(true);
            
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
            connectedWallet = addressArray[0];
            setBtnText("Mint")
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
        //setDisabled(false);                       
        console.error(error);
        return {
            address: ""
        };
    }
  };

  const getPrice = (_amountToMint) => {

    let price = 0;

    let amountLeftToMint = _amountToMint;

    console.log(amountLeftToMint);

    console.log(mintingObject);

    if(mintingObject !== null) {
    
      for(let i = 2; i > 0; i--) {

        if(amountLeftToMint === 0) {
          break;
        }

        if(i in mintingObject) {

          console.log(i, " in minting object");

          const obj = mintingObject[i];

          let leftOfType = obj.maxAmount - obj.amountMinted;

          console.log("left of type before: ", leftOfType)

          if(leftOfType > amountLeftToMint) {
            leftOfType = amountLeftToMint;
          }

          console.log("left of type: ", leftOfType)

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

          console.log("has whitelist");

          //has whitelist
          price += (whitelistPrice * amountLeftToMint);
          amountLeftToMint = 0;

        }
      }

    }

    if(amountLeftToMint > 0 && isPublicMint) {

      price += (amountLeftToMint * publicPrice);

    }

    return price;

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

      return;

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

          connectedWallet = accounts[0];
          setBtnText("Mint")
          mintingObject = null;

          setupWeb3();

        } else {
          connectedWallet = "";
          setBtnText("Connect");
          setMaxAmount(0);
        }
      });
    } else {
      connectedWallet = "";
      setBtnText("No window.ethereum object found");
    }
  }

  const Mint = async () => {

    console.log("mint clicked");

    if(connectedWallet === "") return;
    if(mintingObject == null) return;

    let types = [];

    let maxAmounts = [];

    let amounts = [];

    let proofs = [];

    let amountLeftToMint = amountToMint;

    if(amountLeftToMint === 0) {
      return;
    }

    console.log("amount to mint: ", amountToMint);

    let price = getPrice(amountToMint);

    console.log("price: ", price);
    
    for(let i = 2; i > 0; i--) {

      if(amountLeftToMint === 0) {
        break;
      }

      if(i in mintingObject) {

        const obj = mintingObject[i];

        let leftOfType = obj.maxAmount - obj.amountMinted;

        if(leftOfType > 0) {

          if(leftOfType > amountLeftToMint) {
            leftOfType = amountLeftToMint;
          }

          amounts.push(leftOfType);
          maxAmounts.push(obj.maxAmount);
          proofs.push(obj.proof.proof);
          types.push(i);

          amountLeftToMint -= leftOfType;

        }

      }

    }

    if(amountLeftToMint > 0) {

      if(0 in mintingObject) {

        //has whitelist
        const obj = mintingObject[0];
        amounts.push(amountLeftToMint);
        maxAmounts.push(obj.maxAmount);
        proofs.push(obj.proof.proof);
        types.push(0);

      }

    }

    if(types.length > 0) {

      setWhitelistText("Minting");

      await yugen.methods.whitelistMint(proofs, amounts, types, maxAmounts).send({from : connectedWallet, value : price}).on('receipt', function(receipt){

        setAmountToMint(0);
        
        mintingObject = null;
        setupWeb3();

      });

    } else if(isPublicMint) {

      price = (amountLeftToMint * publicPrice);

      await yugen.methods.publicMint(amountLeftToMint).send({value : price});

    }
  
    //TODO: text
  
  }

  const getText = () => {

    console.log("getting text");

    let text = "";

    console.log(mintingObject);

    if(mintingObject == null) {

      if(isPublicMint) {

        text = "Public Mint"

      } else {
        text = "Wait till Public Mint";
      }

      setWhitelistText(text);

      return;

    }

    for(let i = 2; i > 0; i--) {

      if(i in mintingObject === false) {
        console.log("not in whitelist object");
        continue;
      }

      const obj = mintingObject[i];

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

      text += numLeftToMint.toString();

    }

    if(0 in mintingObject) {

      if(text.length > 0) {
        text += ", "
      }

      text += "Whitelist Mints: Unlimited";

    }


    setWhitelistText(text);

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
    {/*<a href="index.html" className="header-logo"></a>*/}
    <div className="menu-toggle">
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div className="header-menu">
      <div className="header-socials">
        <a href="https://twitter.com/Yugennft" ><img src={twitterimg} alt="social"></img></a>
        <a href="http://www.discord.gg/yugencity" ><img src={discordimg} alt="social"></img></a>
        
      </div>
      <ul className="header-nav">
        <li className="glitch-hover"><a href="https://www.yugen-nft.com/" className="glitching" data-text="Back To Site">Back To Site</a></li>
        
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
          <div className="mint-form">
            <h3 className="mint-form__total">{mintCost > 0 ? mintCost.toFixed(2) + " Eth" : "0 Eth"}</h3>

              <p className="mint-form__text"> <span id="mint-form__text_span">{whitelistText}</span></p>
            
            <div className="mint-form__calc">
              <button className="mint-form__minus" onClick={
                () => {

                  if(amountToMint - 1 < 0) {
                    return;
                  }

                  setAmountToMint(amountToMint - 1);
                  const price = getPrice(amountToMint - 1);
                  let etherValue = ethers.utils.formatEther(price.toString());
              
                  etherValue = parseFloat(etherValue);

                  setMintCost(etherValue);
              
                  
                }
              }></button>
              <div className="mint-form__count">
                <input type="number" value={amountToMint} id="mintAmount"></input>
              </div>
              <button className="mint-form__plus" style={{outline: 'none'}} onClick={ () => {

                if(amountToMint + 1 > maxAmount) {
                  return;
                }

                setAmountToMint(amountToMint + 1);
                const price = getPrice(amountToMint + 1);
                let etherValue = ethers.utils.formatEther(price.toString());
              
                  etherValue = parseFloat(etherValue);

                  setMintCost(etherValue);

              }
                
              }></button>
            </div>
            <button className="mint-form__button" onClick={connectedWallet === "" ? onClickConnect : Mint}>{btnText}</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer className="footer">
    <div className="footer-bg"></div>
    <div className="container">
      <div className="footer-socials">
        <a href="https://twitter.com/Yugennft" ><img src={twitter2img} alt="social"></img></a>
        <a href="http://www.discord.gg/yugencity" ><img src={discord2img} alt="social"></img></a>
      </div>
      <p className="footer-copy">Copyright © 2022</p>
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
