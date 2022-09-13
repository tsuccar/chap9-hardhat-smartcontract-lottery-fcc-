const { assert, expect} = require("chai")
const { getNamedAccounts,ethers } = require("hardhat")
const { isCallTrace } = require("hardhat/internal/hardhat-network/stack-traces/message-trace")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

developmentChains.includes(network.name) 
?  describe.skip 
:  describe("Raffle Unit Tests", function () {
        let raffle, raffleEntranceFee, deployer
    
        beforeEach(async () => {
            // const {deployer} = await getNamedAccounts()
            // deployer = (await getNamedAccounts())["deployer"]
            deployer = (await getNamedAccounts()).deployer
            raffle = await ethers.getContract("Raffle", deployer) // "Raffle" connected to Player
            raffleEntranceFee = await raffle.getEntranceFee()
            console.log(`BeforeEach`)
        })

        describe("fulfillRandomWords", function () {
            it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
                // enter the raffle
                console.log("Setting up test...")
                const startingTimeStamp = await raffle.getLatestTimeStamp()
                const accounts = await ethers.getSigners() //accounts[0]= deployer

                console.log("Setting up Listener...")
                await new Promise(async (resolve, reject) => {
                    // setup listener before we enter the raffle
                    // Just in case the blockchain moves REALLY fast
                    raffle.once("WinnerPicked", async () => {
                        console.log("WinnerPicked event fired!")
                        try {
                            // add our asserts here
                            const recentWinner = await raffle.getRecentWinner()
                            const raffleState = await raffle.getRaffleState()
                            const winnerEndingBalance = await accounts[0].getBalance()
                            const endingTimeStamp = await raffle.getLatestTimeStamp()

                            await expect(raffle.getPlayer(0)).to.be.reverted  //a way of checking the array has been reset.
                            assert.equal(recentWinner.toString(), accounts[0].address)
                            assert.equal(raffleState, 0)
                            assert.equal(
                                winnerEndingBalance.toString(),
                                winnerStartingBalance.add(raffleEntranceFee).toString()
                            )
                            assert(endingTimeStamp > startingTimeStamp)
                            resolve()
                        } catch (error) {
                            console.log(error)
                            reject(error)
                        }
                    })
                    // Then entering the raffle
                    console.log("Entering Raffle...")
                    const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                    await tx.wait(1)
                    console.log("Ok, time to wait...")
                    const winnerStartingBalance = await accounts[0].getBalance()

                    // and this code WONT complete until our listener has finished listening!
                })
            })
        })
})