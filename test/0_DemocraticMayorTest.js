const truffleAssert = require('truffle-assertions');

const DemocraticMayor = artifacts.require('DemocraticMayor')

contract("Testing MyContract", accounts => {
  
  let deployerAddress = accounts[0]; // smart contract deployer address

  let escrow = accounts[1]; // escrow address

  let numberOfCandidates = 5 // number of candidates
  let candidates = accounts.slice(2, 2 + numberOfCandidates); // get addresses of candidates

  let quorum = 8; // test quorum
  //let testSoul = 1000; // a base test soul

  for (let c of candidates) {
      console.log(c);
  }

  it("Test constructor", async function() {
    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
  });

/*
  it("Test cast envelop", async function() {
    const instance = await DemocraticMayor.new(accounts[0], accounts[1], quorum);
    const envelops = await instance.compute_envelope(100, true, testSoul);
    const result = await instance.cast_envelope(envelops);
    truffleAssert.eventEmitted(result, "EnvelopeCast");
  });

  it("Test cast envelop", async function() {
    const instance = await DemocraticMayor.new(accounts[0], accounts[1], quorum);
    const envelops = await instance.compute_envelope(100, true, testSoul);
    const result = await instance.cast_envelope(envelops);
    truffleAssert.eventEmitted(result, "EnvelopeCast");
  });*/

});