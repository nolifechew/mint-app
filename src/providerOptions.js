import WalletConnect from "@walletconnect/web3-provider";

export const providerOptions = {
  walletconnect: {
    package: WalletConnect, // required
    options: {
      infuraId: "5893b3ca7ab34840ae9e26b9617b216b" // required
    }
  }
};
