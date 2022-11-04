import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } from "../helper-hardhat-config";
import { developmentChains } from "../helper-hardhat-config";

const deployLottery: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, subscriptionId;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const tranasctionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await tranasctionResponse.wait(1);
        subscriptionId = tranasctionResponse.events[0].subId;
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId!].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId!].subscriptionId;
    }

    const entranceFee = networkConfig[chainId!].lotteryEntranceFee;
    const gasLane = networkConfig[chainId!].gasLane;
    subscriptionId = networkConfig[chainId!].subscriptionId;
    const callbackGasLimit = networkConfig[chainId!].callbackGasLimit;
    const timeInterval = networkConfig[chainId!].keepersUpdateInterval;
    const args: any[] = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        timeInterval,
    ];
    const lottery = await deploy("Lottery", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: VERIFICATION_BLOCK_CONFIRMATIONS,
    });
};

export default deployLottery;
