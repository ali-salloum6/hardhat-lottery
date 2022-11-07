import { readFileSync, writeFileSync } from "fs";
import { ethers, network } from "hardhat";

const FRONTEND_ADDRESSES_FILE = "../nextjs-decentralized-lottery/constants/contractAddresses.json";
const FRONTEND_ABI_FILE = "../nextjs-decentralized-lottery/constants/abi.json";

async function updateFrontend() {
    if (process.env.UPDATE_FRONTEND) {
        console.log("updating frontend...");
        await updateContractAddresses();
        await updateAbi();
    }
}

async function updateContractAddresses() {
    const lottery = await ethers.getContract("Lottery");
    const chainId = network.config.chainId!?.toString();
    const currentAddresses = JSON.parse(readFileSync(FRONTEND_ADDRESSES_FILE, "utf8"));
    if (chainId in currentAddresses) {
        if (!currentAddresses[chainId].includes(lottery.address)) {
            currentAddresses[chainId].push(lottery.address);
        }
    } else {
        currentAddresses[chainId] = [lottery.address];
    }
    writeFileSync(FRONTEND_ADDRESSES_FILE, JSON.stringify(currentAddresses));
}

async function updateAbi() {
    const lottery = await ethers.getContract("Lottery");
    writeFileSync(
        FRONTEND_ABI_FILE,
        lottery.interface.format(ethers.utils.FormatTypes.json).toString()
    );
}

export default updateFrontend;
updateFrontend.tags = ["all", "frontend"];
