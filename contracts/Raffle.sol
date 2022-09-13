//Enter the lottery (pay some amount)
// Pick a random winner (verifiably random)
//Winner to be selected every X minutes -> completely automated.abi
// so use Chainlink Oracle (Randomeness) & Automated Execution (Chainlink Keeper)
// smart Contracts can't access logs
// function somefn() virtual {}         //virtual means that it's expected to be OVERRIDDEN !!

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol"; //since we are importing @chainlink/contracts/ -yarn add -dev  @chainlink/contracts-
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol"; // not sure what the coordinator does ?
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
error Raffle__NotEnoughETHEntered(); //This patterns saves gas
error Raffle_TransferFailed();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);

/** @title A sample Raffle Contract
 *  @author Patrick Collins
 *  @notice This contract is for creating an teamperable decentraizlized smart contract
 *  @dev this implements Chainlin VRF V2 and keeprs
 */

// is inherriting
contract Raffle is VRFConsumerBaseV2, KeeperCompatibleInterface {
    /*Type declarations*/
    enum RaffleState {
        OPEN,
        CALCULATING
    } // uint256 0 = OPEN, 1 = CALCULATING

    /*  State Variables */
    uint256 private immutable i_entranceFee; //i_for_immutable constant it's not changing. saves gas as well
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator; // only set once
    bytes32 private immutable i_gasLane; // only set it once
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // Lottery Variables - they are also state variables
    address private s_recentWinner;
    RaffleState private s_raffleState;
    uint256 private s_lastTimeStamp;
    uint256 private immutable i_interval;

    /* Events */
    event RaffleEnter(address indexed player);
    event RequestRaffleWinner(uint256 indexed Id);
    event WinnerPicked(address indexed winner);

    //vrfCoordinator is a Chainlink Contract that verifies that the "number" returned by the Chainlink Oracle is verfied to be actually random.
    //https://www.youtube.com/watch?v=JqZWariqh5s

    /* Functions */
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 interval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee; //but the ammount is configurable.
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_raffleState = RaffleState(0); // equals s_raffleState =  RaffleState.OPEN
        s_lastTimeStamp = block.timestamp;
        i_interval = interval;
    }

    function enterRaffle() public payable {
        if (msg.value < i_entranceFee) {
            revert Raffle__NotEnoughETHEntered();
        }
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__NotOpen();
        }
        s_players.push(payable(msg.sender)); //typecasted with payable()
        //Emit an event when we upate a daynamic array or mapping
        //Named ecents with the fucntion name reversed.
        emit RaffleEnter(msg.sender); // they are emitted to storage outside of the contract, names are REVERSED
    }

    /****
     *@dev This is the function that the Chainlink keepr nodes call they look for the `upkeepNeeded` to return true.
     * The following should be true in order to return true:
     * 1. our time interval should have passed.
     * 2 The lottery should have at least 1 player and have some ETH
     * 3 Subscription is funded with LINK.
     * 4. The lottery should be in 'Open' state.
     */
    //public as opposed to external alllows for other internal functions to call it
    function checkUpkeep(
        //this is where off-chain computation happens, this method is run off-chain, gas is run on chainlink node.
        bytes memory /* checkData*/ //calldata >> mmeory because we are call the function with ("") from another function. string is compatible with call data. // could be 'view' instead since we are not changing state but use it abit later
    )
        public
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData*/
        )
    {
        //we are not using checkdata but the whole 'bytes calldata checkData allows you to call even functions ?'
        bool isOpen = (RaffleState.OPEN == s_raffleState);
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        bool hasPlayers = (s_players.length > 0);
        bool hasBalance = address(this).balance > 0;
        upkeepNeeded = (isOpen && timePassed && hasPlayers && hasBalance);
    }

    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep(""); // to check not external attack or to make sure someone else called it
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_raffleState)
            );
        }
        //overriding the virtual in inheritence
        //external functions are cheaper than public functions\
        //2 transaction process, request random number, then do something with it.
        s_raffleState = RaffleState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane, //keyHash=gasLane, which tells the max/ceiling gas you're will to pay in gwei
            i_subscriptionId, // subscriptionID this contract uses for funding the requests.
            REQUEST_CONFIRMATIONS, //how many confimrations chainlink node should wait before responding.
            i_callbackGasLimit, //gas limit for how much gas used for the callback request
            NUM_WORDS // how many random we want,
        );
        // The following line is redundant ! if you take a look at VRFCoordinatorV2Mock.sol
        emit RequestRaffleWinner(requestId); //emits a log to the Oracle specified above.
        // that Oracle is going to look for this reuqest and then create a random number. Next, the Oracle returns the random number
        // in callback function (fullfilled function). the requestRandomWords is hardcoded to look for a callback function. Technically,
        // it's the vrfCoordinator that calling this callback function, because the vrfCoordinator needs to verify that the number is really random.
    }

    // fulfillRandomWords of VRFCoordinator will be called by Chainlink nodes when we will request for randomWords, they will do all the off-chain calculations and will give us random numbers.

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        //can comment out unused
        //external functions are cheaper than public functions\
        //2 transaction process, request random number, then do something with it.
        // here we opt in for just one word return so,
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];
        s_recentWinner = recentWinner;
        s_raffleState = RaffleState.OPEN; //next batch again
        s_players = new address payable[](0); //reset after the winnder - array of size 0
        s_lastTimeStamp = block.timestamp; //reset the time stamp as well.
        (bool success, ) = recentWinner.call{value: address(this).balance}(""); // with no data
        if (!success) {
            // this part added to be gas efficient
            revert Raffle_TransferFailed();
        }
        emit WinnerPicked(recentWinner); //ways to keep list of winners
    }

    /* View / Pure Functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getRaffleState() public view returns (RaffleState) {
        return s_raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        //pure is stored in 'bytecode' not in storage as usage for 'view'
        return NUM_WORDS;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getLatestTimeStamp() public view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        //pure is stored in 'bytecode' not in storage as usage for 'view'
        return REQUEST_CONFIRMATIONS;
    }

    function getInterval() public view returns (uint256) {
        return i_interval;
    }
}
