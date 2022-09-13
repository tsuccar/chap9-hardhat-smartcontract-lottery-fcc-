const { network, ethers } = require("hardhat");
const {developmentChains, networkConfig} = require("../helper-hardhat-config");
const {verify} = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2");

module.exports = async function({getNamedAccounts, deployments}){
    const {deploy, log} = deployments;
    const {deployer} = await getNamedAccounts();
    const chainId = network.config.chainId;
    console.log (`network name : ${network.name}`)
    console.log (`chain id : ${chainId}`)
    let vrfCoordinatorV2Address, subscriptionId


    if (developmentChains.includes(network.name)){
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        // creation and funding for VRF Randomness Mock shown here programatically as opposed to website
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait(1);
        subscriptionId = transactionReceipt.events[0].args.subId; //need to watch the video how this event isproduced. this is coming from the emitted ID provided by Receipt.
        //usually on the real network, you need the link to fund the subscription.
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]// this is value provided after funding the UI with Metamask or manual input.
    }
    const entranceFee = networkConfig[chainId]["entranceFee"]
    const gasLane =  networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    const interval = networkConfig[chainId]["interval"]

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane, 
        subscriptionId,
        callbackGasLimit,
        interval
    ]

    const raffle = await deploy ("Raffle", {
        from: deployer,
        args:args,
        log: true,
        waitConfirmations: network.config.blockConfimations || 1,
    })
    
    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
        log("Verifying ....")
        await verify (raffle.address, args)
    }
    log("-------------------------------------------")
}
module.exports.tags = ["all","raffle"]