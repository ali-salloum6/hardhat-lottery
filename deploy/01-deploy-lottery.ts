import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { VERIFICATION_BLOCK_CONFIRMATIONS, networkConfig } from "../helper-hardhat-config";
import { developmentChains } from "../helper-hardhat-config";
import verify from "../utils/verify";

const VRF_SUB_FUND_AMOUNT = "1000000000000000000000";

const deployLottery: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre;
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address: string | undefined, subscriptionId: string | undefined;

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const tranasctionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await tranasctionResponse.wait();
        subscriptionId = transactionReceipt.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId!].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId!].subscriptionId;
    }

    const lotteryEntranceFee = networkConfig[chainId!].lotteryEntranceFee;
    const gasLane = networkConfig[chainId!].gasLane;
    const callbackGasLimit = networkConfig[chainId!].callbackGasLimit;
    const keepersUpdateInterval = networkConfig[chainId!].keepersUpdateInterval;

    const args: any[] = [
        vrfCoordinatorV2Address,
        lotteryEntranceFee,
        gasLane,
        subscriptionId,
        callbackGasLimit,
        keepersUpdateInterval,
    ];

    const confirmations = developmentChains.includes(network.name)
        ? 1
        : VERIFICATION_BLOCK_CONFIRMATIONS;

    const lottery = await deploy("Lottery", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: confirmations,
    });

    if (!developmentChains.includes(network.name)) {
        log("Verifying...");
        await verify(lottery.address, args);
    }
    log("-----------------------");
};

export default deployLottery;
deployLottery.tags = ["all", "lottery"];
