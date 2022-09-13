const { assert, expect} = require("chai")
const { getNamedAccounts,ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Raffle Unit Tests", function () {
        let raffle,vrfCoordinatorV2Mock, raffleEntranceFee, deployer, interval, raffleContract, player 
        const chainId = network.config.chainId;
        beforeEach(async () => {
            // const {deployer} = await getNamedAccounts()
            // deployer = (await getNamedAccounts())["deployer"]
            deployer = (await getNamedAccounts()).deployer
            // accounts = await ethers.getSigners() // could also do getSigners()
            // player = accounts[1] // deployer = accounts[0]
            // console.log(`Accounts: ${JSON.stringify(accounts[0])}`) 
            await deployments.fixture(["all"]) //////////////DEPLOYS//////////// modules with the tags "mocks" and "raffle"
            // raffle = await ethers.getContract("Raffle", deployer) // "Raffle" connected to deployer.
            raffle = await ethers.getContract("Raffle", deployer) // "Raffle" connected to Player
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer) // "Raffle" connected to deployer.
            raffleEntranceFee = await raffle.getEntranceFee()
            interval = await raffle.getInterval()
            console.log(`BeforeEach Interval ${interval}`)
        })

        describe ("constructor", function(){
                it("initializes the raffle correctly", async function(){
                    //Ideally we make sure our tests have just 1 assert per "it".
                    const raffleState = await raffle.getRaffleState() //returns a bigNumber uint256
                    const interval = await raffle.getInterval()
                    assert.equal(raffleState.toString(), "0") //Enum = OPEN  
                    assert.equal(interval.toString(), networkConfig[chainId]["interval"]) //whatever configured in helpher-hardhat-config.js
                })
        })

        describe("enterRaffle", function(){
                it("reverts when you don't pay enough",async function(){
                    await expect (raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnoughETHEntered")
                })
                it("records players when they enter", async function(){
                    await raffle.enterRaffle({value: raffleEntranceFee})
                    const playerFromContract = await raffle.getPlayer(0)
                    assert.equal(playerFromContract, deployer)
                })
                // ethereum-waffle.readthedocs.io/en/latest/matchers.html#emitting-events
                it("emits event on enter",async function(){
                    await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(raffle,"RaffleEnter")
                })
                it("doesn't allow entrance when raffle is calculating", async function (){
                    await raffle.enterRaffle({ value: raffleEntranceFee })
                    // for a documentation of the methods below, go here: https://hardhat.org/hardhat-network/reference
                    await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                    await network.provider.send("evm_mine",[]) //instruct to mine a extra block OR
                    // await network.provider.request({ method: "evm_mine", params: [] }) //instruct to mine a extra block
                    // we pretend to be a keeper for a second
                    await raffle.performUpkeep([]) // changes the state to calculating for our comparison below // passing empty "callData"
                    // is reverted as raffle is calculating
                    await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith( 
                        "Raffle__NotOpen"
                    )
                })
        })
        //  CallStatic is eithers function - https://docs.ethers.io/v5/api/contract/contract/#contract-callStatic
        //callStatic does is it tells us the nodes to "pretend" that the call is not state-changing. Consequently, they will return the result 
        //accordingly which does not lead to a change in state. Thus, it is very useful in this case, accomplishing our goal of "simulating" checkUpkeep (i.e. check all the conditionals in there) whilst not changing the state.
        // I guess we are doing a pretend call since we are using a "public" instead of "view" as would be if we were not doing unit test and that "view" function would not do transaction ?
        // why would that matter ?
        describe("checkUpkeep", function () { //not 100% sure how "hasPlayers" condition is met here and why callStatic is needed.
            it("returns false if people haven't sent any ETH", async () => {
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert(!upkeepNeeded)                                               //callStatic is to say do a simulation and not actual transaction. offchain ? not sure why this is difficult
            })              // I son't see how the condition of players is met. are we assuming no players == no ETH ?
            it("returns false if raffle isn't open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                await raffle.performUpkeep([]) // changes the state to calculating
                const raffleState = await raffle.getRaffleState() // stores the new state
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") //"0x"="[]" upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
            })
            it("returns false if enough time hasn't passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert(!upkeepNeeded)
            })
            it("returns true if enough time has passed, has players, eth, and is open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert(upkeepNeeded)
            })
        })

        describe("performUpkeep", function () {
            it("can only run if checkupkeep is true", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const tx = await raffle.performUpkeep("0x") 
                assert(tx)
            })
            it("reverts if checkup is false", async () => {
                await expect(raffle.performUpkeep("0x")).to.be.revertedWith( 
                    "Raffle__UpkeepNotNeeded"
                )
            })
            it("updates the raffle state, emits and event, and calls the vrf coordinator", async () => {
                // Too many asserts in this test!
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.send("evm_mine",[])
                const txResponse = await raffle.performUpkeep([]) // emits requestId
                const txReceipt = await txResponse.wait(1) // waits 1 block
                const requestId = await txReceipt.events[1].args[0]
                const raffleState = await raffle.getRaffleState() // updates state
                console.log(`requestId.toNumber : ${requestId}`)
                assert(requestId.toNumber() > 0)
                assert(raffleState.toString() == "1") // 0 = open, 1 = calculating
            })
        })

        // The next usecase when calling fullfillRandomWords without PerformupKeep first. threfore, there is no "requestId"
        describe("fulfillRandomWords", function () {
            beforeEach(async () => {    // stage it with someone entering the raffle
                await raffle.enterRaffle({ value: raffleEntranceFee })
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
            })
            it("can only be called after performupkeep", async () => {
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address) // reverts if not fulfilled, if request ID doesn not exit
                ).to.be.revertedWith("nonexistent request")
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address) // reverts if not fulfilled
                ).to.be.revertedWith("nonexistent request")
            })

          // This test is too big...
          // This test simulates users entering the raffle and wraps the entire functionality of the raffle
          // inside a promise that will resolve if everything is successful.
          // An event listener for the WinnerPicked is set up
          // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
          // All the assertions are done once the WinnerPicked event is fired
          ///////////   In the local development, it will ALWAYS RETURNS the SAME WINNER INDEX /////////////.
            it("picks a winner, resets, and sends money", async () => {
                const additionalEntrances = 3 // to test
                const startingIndex = 1
                const accounts = await ethers.getSigners()
                for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) { // i = 2; i < 5; i=i+1
                    raffleContract = await ethers.getContract("Raffle") // Returns a new connection to the Raffle contract
                    raffle = raffleContract.connect(accounts[i]) // Returns a new instance of the Raffle contract connected to player
                    await raffle.enterRaffle({ value: raffleEntranceFee })
                }
                const startingTimeStamp = await raffle.getLatestTimeStamp() // stores starting timestamp (before we fire our event)
                // performUpkeep (mock being Chainlink keepers)
                // fulfillRandomWords (mock being the Chainlink VRF)
                // Here we will have to simulate or wait for the fulfillment to be called (threfore, setup a listener, we don't want th test to finish the test before the listner has done it's listening)
                // This will be more important for our staging tests...
                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => { // event listener for WinnerPicked
                        console.log("WinnerPicked event fired!")
                        // assert throws an error if it fails, so we need to wrap
                        // it in a try/catch so that the promise returns event
                        // if it fails.
                        try {
                            // Now lets get the ending values...
                            const recentWinner = await raffle.getRecentWinner()
                            console.log(`Recent Winner : ${recentWinner}`)
                            console.log(`Accounts 2: ${accounts[2].address }`)
                            console.log(`Accounts 0: ${accounts[0].address }`)
                            console.log(`Accounts 1: ${accounts[1].address}`)
                            console.log(`Accounts 3: ${accounts[3].address }`)
                            const raffleState = await raffle.getRaffleState()
                            const endingTimeStamp = await raffle.getLatestTimeStamp()
                            const numPlayers = await raffle.getNumberOfPlayers()
                            const winnerEndingBalance= await accounts[1].getBalance()
                            await expect(raffle.getPlayer(0)).to.be.reverted
                            // Comparisons to check if our ending values are correct:
                            assert.equal(numPlayers.toString(),"0") //at this point the, it should reset.
                            assert.equal(raffleState.toString(), "0") //raffleState should be back to OPEN
                            assert.equal(
                                winnerEndingBalance.toString(), 
                                winnerStartingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                                    .add(
                                        raffleEntranceFee
                                            .mul(additionalEntrances)
                                            .add(raffleEntranceFee)
                                    )
                                    .toString()
                            )
                            assert(endingTimeStamp > startingTimeStamp)
                        } catch (e) { 
                            reject(e) // if try fails, rejects the promise
                        }
                        resolve() // if try passes, resolves the promise 
                    })

                    // kicking off the event by mocking the chainlink keepers and vrf coordinator for the already staged listening happening above (sort of backwards here to make sure that the listner had a chance to listen first)
                    const tx = await raffle.performUpkeep("0x")
                    const txReceipt = await tx.wait(1)
                    const winnerStartingBalance = await accounts[1].getBalance() // getting the winner balance, in this case it's always 1
                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        // txReceipt.events[1].args.requestId, <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
                        txReceipt.events[1].args[0],
                        raffle.address
                    )
                    console.log(`txReceipt.events[1].args[0] ${txReceipt.events[1].args[0]}`)
                    console.log(`txReceipt.events[1] ${JSON.stringify(txReceipt.events[1])}`) // need to learn more about events why 1?
                    console.log(`txReceipt ${JSON.stringify(txReceipt)}`) // need to learn more about events why 1?
                })
            })
        })
        
    })