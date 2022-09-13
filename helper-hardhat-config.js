const { ethers } = require("hardhat")

const networkConfig = {
    4: {
        name: "rinkeby",
        vrfCoordinatorV2:"0x6168499c0cFfCaCD319c818142124B7A15E857ab",
        entranceFee: ethers.utils.parseEther("0.01"), //player fee
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc", //VRF gaLane
        subscriptionId: "21412", // https://vrf.chain.link/rinkeby/21412//used for VRF randomness
        callbackGasLimit: "500000", //read supplemental Readme note but used to fullfill the request.
        interval: "30", //seconds
    },
    31337:{
        name: "localhost",
        // vrfCoordinatorV2: "", Not needed Mock would be deployed
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",//gasLane it's a mock, don't need it
        subscriptionId: "588", //done progrmatically in 01-deploy-raffle.js, done via website for Rinkeby" ,
        callbackGasLimit: "500000", //read supplemental Readme note but used to fullfill the request.
        interval: "30", //seconds
    }

}

const developmentChains = ["hardhat", "localhost"]
const FRONT_END_ADDRESSES_FILE="../chap10-nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
const FRONT_END_ABI_FILE="../chap10-nextjs-smartcontract-lottery-fcc/constants/abi.json"


module.exports = {networkConfig, developmentChains,FRONT_END_ADDRESSES_FILE,FRONT_END_ABI_FILE}