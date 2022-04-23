import { expect } from "chai";
import { BigNumber, ContractReceipt } from "ethers";
import { ethers } from "hardhat";
import { Contract, ContractFactory, Signer } from "ethers";

describe("BountyExchange", function () {
  let BountyExchangeFactory: ContractFactory;
  let TokenFactory: ContractFactory;
  let stolenToken: Contract;
  let bountyToken: Contract;
  let BountyExchange: Contract;

  let stolenAmount = BigNumber.from("100");
  let bountyAmount = BigNumber.from("100");

  // let contractDeployer: Signer;
  // let bountyRequester: Signer;
  // let bountyProvider: Signer;

  let bountyRequest: string;
  this.beforeEach(async () => {
    const [, bountyRequester, bountyProvider] = await ethers.getSigners();
    TokenFactory = await ethers.getContractFactory("MyToken");
    bountyToken = await TokenFactory.deploy(
      "Tether USD",
      "USDT",
      "1000000000000000000000"
    );
    stolenToken = await TokenFactory.deploy(
      "W Token",
      "WTOK",
      "1000000000000000000000"
    );
    BountyExchangeFactory = await ethers.getContractFactory("BountyExchange");
    BountyExchange = await BountyExchangeFactory.deploy();
    await BountyExchange.deployed();

    // transfer funds to bounty requester
    await stolenToken.transfer(bountyRequester.address, stolenAmount);

    // transfer funds to bounty provider
    await bountyToken.transfer(bountyProvider.address, bountyAmount);

    // Approve funds from bountyRequester to contract
    await stolenToken
      .connect(bountyRequester)
      .approve(BountyExchange.address, stolenAmount);

    const requestBountyResponse = await BountyExchange.connect(
      bountyRequester
    ).requestBounty(
      stolenAmount,
      stolenToken.address,
      bountyAmount,
      bountyToken.address
    );

    const requestBountyReceipt: ContractReceipt =
      await requestBountyResponse.wait();

    const requestBountyEvent = requestBountyReceipt.events?.find((x) => {
      return x.event == "RequestBounty";
    });

    const args = requestBountyEvent?.args;

    // bountyRequest = await BountyExchange.getBountyRequest(args ? args.requestId : "");
    bountyRequest = args ? args.requestId : "";
  });

  it("Should create a bounty request", async function () {
    const stolenTokenContractBalance = await stolenToken.balanceOf(
      BountyExchange.address
    );
    expect(stolenTokenContractBalance).to.equals(stolenAmount);

    // Check event emitted
  });
  it("Should submit bounty", async function () {
    const [, bountyRequester, bountyProvider] = await ethers.getSigners();
    await bountyToken
      .connect(bountyProvider)
      .approve(BountyExchange.address, bountyAmount);

    await BountyExchange.connect(bountyProvider).submitBounty(bountyRequest);

    const bountyRequesterBalance = await bountyToken.balanceOf(
      bountyRequester.address
    );
    expect(bountyRequesterBalance).to.equals(bountyAmount);

    const bountyProviderBalance = await stolenToken.balanceOf(
      bountyProvider.address
    );
    expect(bountyProviderBalance).to.equals(stolenAmount);

    // Check event emitted
  });
});
