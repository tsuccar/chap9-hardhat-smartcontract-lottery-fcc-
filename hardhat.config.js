require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "https://eth-rinkeby/example"
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0xkey"                   // from Metamask
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key"
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "key"

module.exports = {
    detalutNetwork: "hardhat",
    networks: {
        hardhat:{
            chainId:31337,
            blockConfirmations:1                     // local network only does 1 block confirmaiton after transactoin
        },
        rinkeby: {
          url: RINKEBY_RPC_URL || "",
          accounts: [PRIVATE_KEY],
          chainId: 4,
          blockConfirmations: 6,                      // this gives etherscan a chance to catchup to start verification
        },                                            
        localhost: {
          url: "http://127.0.0.1:8545",               // modify after running - yarn hardhat node
          // Accounts: Provided by hardhat                               
          chainId: 31337,                             // same as hardhat
        },
      },
      etherscan: {
        // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
        apiKey: {
            rinkeby: ETHERSCAN_API_KEY,
        },
    },
      gasReporter: {
        enabled: true,                              //enable when needed
        outputFile: "gas-reporter.txt",
        noColors: true,                             // colors messes it up
        currency: "USD",
        coinmarketcap: COINMARKETCAP_API_KEY,
        // token: "MATIC"                              // Default is ETH, if 'Polygon' network is needed, then we go with MATIC
      },
      solidity: {
        compilers: [
            {
                version: "0.8.7",
            },
        ],
    },
    namedAccounts: {
        deployer: {
          default: 0,                                 // by default, 0th account would be 'deployer'
          1 : 0   // similarly on mainnet it will take the first account as deployer. Note though that depending on how hardhat network are configured, the account 0 on one network can be different than on another
        },
        player: {
          default: 1,                                  // as an example if user is needed for testing.
        }
      },
      mocha: {
        timeout: 500000, // 500 seconds max for running tests
    },
}


