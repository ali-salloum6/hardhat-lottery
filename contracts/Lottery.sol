// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

/* Types */
enum LotteryState {
    OPEN,
    PROCESSING
}

error Lottery__NotEnoughETHEntered();
error Lottery__TransferFailed();
error Lottery__LotteryIsNotOpen();
error Lottery__upkeepNotNeeded(LotteryState lotteryState, uint256 balance);

/**
 * @author Ali Salloum
 * @notice This contract an untamperable decentralized lottery 
 * @dev This contract implements Chainlink VRF v2 and Chainlink Automation
 */
contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    /* State Variables */
    uint256 private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    bytes32 private immutable i_gasLane;
    uint64 private immutable i_subscriptionId;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint16 private constant NUM_WORDS = 1;

    // Lottery Variables
    address payable s_recentWinner;
    LotteryState private s_lotteryState;
    uint256 private s_lastTimestamp;
    uint256 private immutable i_timeInterval;

    /* Events */
    event LotteryEntered(address indexed player);
    event RequestedLotteryWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    /* Functions */
    constructor(
        address vrfCoordinatorV2,
        uint256 entranceFee,
        bytes32 gasLane,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 timeInterval
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        s_lotteryState = LotteryState.OPEN;
        s_lastTimestamp = block.timestamp;
        i_timeInterval = timeInterval;
    }

    /**
     * Adds the caller to the list of participating players
     * and gives them a chance to win
     * Requirments:
     * - the caller sent a value greater or equal to the entrance fee
     * - the lottery is open
     */
    function enterLottery() public payable {
        // check if the player has enough funds to participate
        if (msg.value < i_entranceFee) {
            revert Lottery__NotEnoughETHEntered();
        }
        if (s_lotteryState != LotteryState.OPEN) {
            revert Lottery__LotteryIsNotOpen();
        }
        s_players.push(payable(msg.sender));
        emit LotteryEntered(msg.sender);
    }

    /**
     * @dev This is the function that the chainlink automation nodes
     * call and perform if `upkeepNeeded` is true
     * All of the following should be true in order to return true:
     * 1. The time interval has passed between lottery runs.
     * 2. The lottery is open.
     * 3. The contract has ETH.
     * 4. Implicity, the subscription is funded with LINK.
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (
            bool upkeepNeeded,
            bytes memory /* performData */
        )
    {
        bool isOpen = (s_lotteryState == LotteryState.OPEN);
        bool timePassed = ((block.timestamp - s_lastTimestamp) > i_timeInterval);
        bool hasBalance = (address(this).balance > 0);
        upkeepNeeded = (isOpen && timePassed && hasBalance);
    }

    /**
     * @dev Sets the state to processing and requests a random number using
     * Chainlink VRF v2
     * 
     * first checks if upkeep is needed or the function was called incorrectly
     */
    function performUpkeep(
        bytes calldata /* performData */
    ) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__upkeepNotNeeded(s_lotteryState, address(this).balance);
        }
        s_lotteryState = LotteryState.PROCESSING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedLotteryWinner(requestId);
    }

    /**
     * @dev handles the random number received from Chainlink VRF
     * 
     * Picks the winner based on the random number and sends the funds,
     * and sets the contract's state back to the starting state.
     */
    function fulfillRandomWords(
        uint256, /*requestId*/
        uint256[] memory randomWords
    ) internal override {
        uint256 winnerIndex = randomWords[0] % s_players.length;
        address payable winner = s_players[winnerIndex];
        s_recentWinner = winner;
        s_lotteryState = LotteryState.OPEN;
        delete s_players;
        s_lastTimestamp = block.timestamp;
        (bool success, ) = winner.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit WinnerPicked(winner);
    }

    /* View/Pure functions */
    function getEntranceFee() public view returns (uint256) {
        return i_entranceFee;
    }

    function getPlayer(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() public view returns (address) {
        return s_recentWinner;
    }

    function getLotteryState() public view returns (LotteryState) {
        return s_lotteryState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getLastTimeStamp() public view returns (uint256) {
        return s_lastTimestamp;
    }

    function getInterval() public view returns (uint256) {
        return i_timeInterval;
    }

    function getNumberOfPlayers() public view returns (uint256) {
        return s_players.length;
    }

    function getRequestConfirmations() public pure returns(uint256) {
        return REQUEST_CONFIRMATIONS;
    }
}
