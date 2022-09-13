const { FRONT_END_ADDRESSES_FILE, FRONT_END_ABI_FILE } = require("../helper-hardhat-config")
const fs = require("fs")
const { network,ethers } = require("hardhat")

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end written!")
    }
}
// this is not same as solidity itnerfacer, but it allows us to get the ABIs from the contract
async function updateAbi() {
    const raffle = await ethers.getContract("Raffle")
    fs.writeFileSync(FRONT_END_ABI_FILE, raffle.interface.format(ethers.utils.FormatTypes.json))
}

async function updateContractAddresses() {
    const raffle = await ethers.getContract("Raffle")
    const currentAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"))
    if (network.config.chainId.toString() in currentAddresses) {
        if (!currentAddresses[network.config.chainId.toString()].includes(raffle.address)) {
            currentAddresses[network.config.chainId.toString()].push(raffle.address)
        }
    } else {
        currentAddresses[network.config.chainId.toString()] = [raffle.address]
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}
module.exports.tags = ["all", "frontend"]


// const FRONT_END_ADDRESSES_FILE="../chap10-nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
// const FRONT_END_ABI_FILE="../chap10-nextjs-smartcontract-lottery-fcc/constants/abi.json"