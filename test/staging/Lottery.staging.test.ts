import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains } from "../../helper-hardhat-config";
import { Lottery } from "../../typechain-types";

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery Staging Tests", function () {
          let lottery: Lottery, entranceFee: BigNumber, deployer: string;

          this.beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              lottery = await ethers.getContract("Lottery", deployer);
              entranceFee = await lottery.getEntranceFee();
          });

          describe("fulfillRandomWords", function () {
              it("works with live chainlink keepers and chainlink VRF", async function () {
                  const startingTimeStamp = await lottery.getLastTimeStamp();
                  const accounts = await ethers.getSigners();
                  await new Promise<void>(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          console.log("WinnerPicked event fired");
                          try {
                              const recentWinner = await lottery.getRecentWinner();
                              const lotteryState = await lottery.getLotteryState();
                              const winnerEndingBalance = await accounts[0].getBalance();
                              const endingTimeStamp = await lottery.getLastTimeStamp();
                              await expect(lottery.getPlayer(0)).to.be.reverted;
                              assert.equal(recentWinner.toString(), accounts[0].address);
                              assert.equal(lotteryState.toString(), "0");
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(entranceFee).toString()
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (e) {
                              console.log(e);
                              reject();
                          }
                      });
                      await lottery.enterLottery({ value: entranceFee });
                      const winnerStartingBalance = await accounts[0].getBalance();
                  });
              });
          });
      });
