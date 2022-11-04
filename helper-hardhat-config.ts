export interface networkConfigItem {
    name?: string;
    subscriptionId?: string;
    gasLane?: string;
    keepersUpdateInterval?: string;
    lotteryEntranceFee?: string;
    callbackGasLimit?: string;
    vrfCoordinatorV2?: string;
}

export interface networkConfigInfo {
    [key: number]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
    31337: {
        name: "localhost",
        subscriptionId: "5429",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 30 gwei
        keepersUpdateInterval: "30",
        lotteryEntranceFee: "100000000000000000", // 0.1 ETH
        callbackGasLimit: "500000", // 500,000 gas
    },
    5: {
        name: "goerli",
        subscriptionId: "5429",
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15", // 150 gwei
        keepersUpdateInterval: "30",
        lotteryEntranceFee: "100000000000000000", // 0.1 ETH
        callbackGasLimit: "500000", // 500,000 gas
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
    },
    1: {
        name: "mainnet",
        keepersUpdateInterval: "30",
        gasLane: "0x8af398995b04c28e9951adb9721ef74c74f93e6a478f39e7e0777be13527e7ef",
    },
};

export const VERIFICATION_BLOCK_CONFIRMATIONS = 3;
export const developmentChains = ["hardhat", "localhost"];
