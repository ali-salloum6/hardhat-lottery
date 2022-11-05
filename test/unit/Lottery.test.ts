import { assert, expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { deployments, ethers, getNamedAccounts, network } from "hardhat";
import { developmentChains, networkConfig } from "../../helper-hardhat-config";
import { Lottery, VRFCoordinatorV2Mock } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", function () {
          let lottery: Lottery,
              vrfCoordinatorV2Mock: VRFCoordinatorV2Mock,
              entranceFee: BigNumber,
              deployer: string,
              interval: number,
              accounts: SignerWithAddress[];
          const chainId = network.config.chainId;

          this.beforeEach(async function () {
              accounts = await ethers.getSigners();
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              lottery = await ethers.getContract("Lottery", deployer);
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              entranceFee = await lottery.getEntranceFee();
              interval = (await lottery.getInterval()).toNumber();
          });

          describe("constructor", function () {
              it("Initializes Lottery correctly", async function () {
                  const lotteryState = await lottery.getLotteryState();
                  const interval = await lottery.getInterval();
                  assert.equal(lotteryState.toString(), "0");
                  assert.equal(interval.toString(), networkConfig[chainId!].keepersUpdateInterval);
              });
          });

          describe("enterLottery", function () {
              it("reverts when you don't pay enough", async function () {
                  await expect(lottery.enterLottery()).to.be.revertedWithCustomError(
                      lottery,
                      "Lottery__NotEnoughETHEntered"
                  );
              });
              it("records players when they enter", async function () {
                  await lottery.enterLottery({ value: entranceFee });
                  const player = await lottery.getPlayer(0);
                  assert.equal(player, deployer);
              });
              it("emits an event on enter", async function () {
                  await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
                      lottery,
                      "LotteryEntered"
                  );
              });
              it("reverts if the lottery is calculating", async function () {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval + 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  await lottery.performUpkeep([]);
                  await expect(
                      lottery.enterLottery({ value: entranceFee })
                  ).to.be.revertedWithCustomError(lottery, "Lottery__LotteryIsNotOpen");
              });
          });

          describe("checkUpkeep", function () {
              it("returns false if lottery isn't open", async function () {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval - 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  await lottery.performUpkeep([]);
                  const lotteryState = await lottery.getLotteryState();
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert.equal(lotteryState.toString(), "1");
                  assert(!upkeepNeeded);
              });

              it("returns false if enough time hasn't passed", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval - 2]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  assert(!upkeepNeeded);
              });
              it("returns true if enough time has passed, has players, eth, and is open", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval - 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x");
                  assert(upkeepNeeded);
              });
          });

          describe("performUpkeep", function () {
              it("can only run if checkUpkeep is true", async function () {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval - 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const tx = await lottery.performUpkeep([]);
                  assert(tx);
              });
              it("reverts when checkUpkeep is false", async function () {
                  await expect(lottery.performUpkeep([])).to.be.revertedWithCustomError(
                      lottery,
                      "Lottery__upkeepNotNeeded"
                  );
              });
              it("updates the lottery state and emits a requestId", async () => {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval - 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
                  const txResponse = await lottery.performUpkeep([]);
                  const txReceipt = await txResponse.wait(1);
                  const lotteryState = await lottery.getLotteryState();
                  const requestId = txReceipt!.events![1].args!.requestId;
                  assert(requestId.toNumber() > 0);
                  assert(lotteryState == 1);
              });
          });
          describe("fulfillRandomWords", function () {
              this.beforeEach(async function () {
                  await lottery.enterLottery({ value: entranceFee });
                  await network.provider.send("evm_increaseTime", [interval - 1]);
                  await network.provider.request({ method: "evm_mine", params: [] });
              });
              it("can only be called after performupkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request");
              });
              it("picks a winner, resets the lottery, and sends the money", async function () {
                  it("picks a winner, resets, and sends money", async () => {
                      const additionalEntrances = 3;
                      const startingIndex = 2;
                      let lotteryContract = await ethers.getContract("Lottery");
                      let lottery: Contract;
                      for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                          lottery = lotteryContract.connect(accounts[i]);
                          await lottery.enterLottery({ value: entranceFee });
                      }
                      const startingTimeStamp = await lottery!.getLastTimeStamp();

                      await new Promise<void>(async (resolve, reject) => {
                          lottery.once("WinnerPicked", async () => {
                              console.log("WinnerPicked event fired!");
                              try {
                                  const recentWinner = await lottery.getRecentWinner();
                                  const lotteryState = await lottery.getLotteryState();
                                  const winnerBalance = await accounts[2].getBalance();
                                  const endingTimeStamp = await lottery.getLastTimeStamp();
                                  await expect(lottery.getPlayer(0)).to.be.reverted;
                                  assert.equal(recentWinner.toString(), accounts[2].address);
                                  assert.equal(lotteryState, 0);
                                  assert.equal(
                                      winnerBalance.toString(),
                                      startingBalance
                                          .add(
                                              entranceFee.mul(additionalEntrances).add(entranceFee)
                                          )
                                          .toString()
                                  );
                                  assert(endingTimeStamp > startingTimeStamp);
                                  resolve();
                              } catch (e) {
                                  reject(e);
                              }
                          });

                          const tx = await lottery.performUpkeep("0x");
                          const txReceipt = await tx.wait(1);
                          const startingBalance = await accounts[2].getBalance();
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              txReceipt!.events![1].args!.requestId,
                              lottery.address
                          );
                      });
                  });
              });
          });
      });
