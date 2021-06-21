const truffleAssert = require('truffle-assertions');

const DemocraticMayor = artifacts.require('DemocraticMayor')

contract("Testing MyContract", accounts => {
  
  let deployerAddress = accounts[0]; // smart contract deployer address

  let escrow = accounts[1]; // escrow address

  let numberOfCandidates = 5 // number of candidates
  let candidates = accounts.slice(2, 2 + numberOfCandidates); // get addresses of candidates
  let soul_candidates = [100, 50, 120, 70, 40]; // TODO: randomize...

  let quorum = 8; // test quorum
  let testSoul = 1000; // a base test soul

  for (let c of candidates) {
      console.log(c);
  }

  
  it("Test constructor ok", async function() {
    const instance = await DemocraticMayor.new(candidates, soul_candidates, escrow, quorum);
  });

  it("Test constructor ko for negative soul", async function() {
    let soul_candidates = [100, -50, 120, 70, 40];
    await truffleAssert.fails(DemocraticMayor.new(candidates, soul_candidates, escrow, quorum));
  });

  it("Test cast envelop", async function() {
    const instance = await DemocraticMayor.new(candidates, soul_candidates, escrow, quorum);
    const envelops = await instance.compute_envelope(100, candidates[0], testSoul);
    const result = await instance.cast_envelope(envelops);
    truffleAssert.eventEmitted(result, "EnvelopeCast");
  });

  it("Test open_envelope without reaching quorum", async function() {
    const instance = await DemocraticMayor.new(candidates, soul_candidates, escrow, quorum);
    const envelops = await instance.compute_envelope(100, candidates[0], testSoul);
    await instance.cast_envelope(envelops);
    await truffleAssert.fails(instance.open_envelope.call(100, candidates[0], { value: testSoul }));
  });

  it("Try open_envelope with quorum achievement", async function() {
    const instance = await DemocraticMayor.new(candidates, soul_candidates, escrow, quorum);

    for (let i = 0; i < quorum; i++) {
      const envelops = await instance.compute_envelope(i, candidates[0], (i + 1) * testSoul);
      const result = await instance.cast_envelope(envelops, { from: accounts[i + 2] });

    }

    for (let i = 0; i < quorum; i++) {
      const result = await instance.open_envelope(i, candidates[0], { from: accounts[i + 2], value: (i + 1) * testSoul });
      truffleAssert.eventEmitted(result, "EnvelopeOpen");
    }

  });

  it("Test call mayor_or_sayonara without opening the envelopes", async function() {
    const instance = await DemocraticMayor.new(candidates, soul_candidates, escrow, quorum);
    await truffleAssert.fails(instance.mayor_or_sayonara());
  });

  it("Test call mayor_or_sayonara with a winner, say 'NewMayor'", async function() {
    const instance = await DemocraticMayor.new(candidates, soul_candidates, escrow, quorum);

    for (let i = 0; i < quorum; i++) {
      const envelops = await instance.compute_envelope(i, candidates[0], (i + 1) * testSoul);
      await instance.cast_envelope(envelops, { from: accounts[i + 2] });
    }

    for (let i = 0; i < quorum; i++) {
      await instance.open_envelope(i, candidates[0], { from: accounts[i + 2], value: (i + 1) * testSoul });
    }
    const result = await instance.mayor_or_sayonara();

    truffleAssert.eventEmitted(result, "NewMayor");
  });


});