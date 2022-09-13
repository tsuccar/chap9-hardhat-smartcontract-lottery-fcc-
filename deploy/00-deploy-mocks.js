const {developmentChains} = require ("../helper-hardhat-config.js")

//https://docs.chain.link/docs/vrf/v2/supported-networks/#rinkeby-testnet-deprecated
const BASE_FEE = ethers.utils.parseEther("0.25") //premium cost in LINK, reason it costs as opposed priceFeed is that this randomoness is not sponsored for our randomness
const GAS_PRICE_LINK =  1e9//calculated value  based on the gas price of the chain. Link per gas that nodes need to call the callbacks.

//basically BASE_FEE is the Off-Set for the oracle work that the nodes do, However, GAS_PRICE_LINK is addtinal cost that 
// calculated when the gas price goes above "some" limit so they don't go bankrupt.

//Chainlink Nodes pay the gas fees to give us randomness & do external execution
// in summary, the price of requests (to respond and call fullfillment() function) changes based on the price of gas.

module.exports = async function({getNamedAccounts, deployments}){
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const chainId = network.config.chainId;

    if (developmentChains.includes(network.name)){
        log("local network detected ! Deploying mocks ...")

        await deploy ("VRFCoordinatorV2Mock",{
            from: deployer,
            args:[BASE_FEE, GAS_PRICE_LINK],//populates with VRFCoordinatorV2Mock.sol constructor
            log: true,
        })
        log("Mocks Deployed!")
        log("------------------------------------------------------")
    }
}
module.exports.tags = ["all","mocks"];