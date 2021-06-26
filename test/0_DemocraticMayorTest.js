const truffleAssert = require('truffle-assertions');

const DemocraticMayor = artifacts.require('DemocraticMayor')

contract("Testing DemocraticMayor", accounts => {
  
  let deployerAddress = accounts[0]; // smart contract deployer address

  let escrow = accounts[1]; // escrow address

  let numberOfCandidates = 5 // number of candidates
  let candidates = accounts.slice(2, 2 + numberOfCandidates); // get addresses of candidates

  let quorum = 5; // test quorum
  let testSoul = 1000; // a base test soul

  it("Test constructor ok", async function() {
    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
  });

  it("Test cast envelop", async function() {
    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
    const envelop = await instance.compute_envelope(100, candidates[0], testSoul);
    const result = await instance.cast_envelope(envelop);
    truffleAssert.eventEmitted(result, "EnvelopeCast");
  });

  it("Test open_envelope without reaching quorum", async function() {
    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
    const envelop = await instance.compute_envelope(100, candidates[0], testSoul);
    await instance.cast_envelope(envelop);
    await truffleAssert.fails(instance.open_envelope.call(100, candidates[0], { value: testSoul }));
  });

  it("Try open_envelope with quorum achievement", async function() {
    const instance = await DemocraticMayor.new(candidates, escrow, quorum);

    for (let i = 0; i < quorum; i++) {
      const envelop = await instance.compute_envelope(i, candidates[0], (i + 1) * testSoul);
      const result = await instance.cast_envelope(envelop, { from: accounts[i + 2] });
 
    }

    for (let i = 0; i < quorum; i++) {
      const result = await instance.open_envelope(i, candidates[0], { from: accounts[i + 2], value: (i + 1) * testSoul });
      truffleAssert.eventEmitted(result, "EnvelopeOpen");
    }

  });

  it("Test candidate deposit soul", async function() {
    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
    for (let i = 0; i < candidates.length; i++) {
      await instance.add_deposit.sendTransaction({from: candidates[i], value: 1000000000000 * (i + 1)});
    }
  });

  it("Test non-candidate deposit soul", async function() {
    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
    await truffleAssert.fails(instance.add_deposit.sendTransaction({from: accounts[10], value: 1000000000000}));    
  });

  it("Test call mayor_or_sayonara without opening the envelopes", async function() {
    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
    await truffleAssert.fails(instance.mayor_or_sayonara());
  });

  it("Testing mayor_or_sayonara: NewMayor is candidate0 by souls", async function() {
    let quorum = 5; // test quorum

    const instance = await DemocraticMayor.new(candidates, escrow, quorum);

    // candidate deposit souls
    for (let i = 0; i < candidates.length; i++) {
      await instance.add_deposit({from: candidates[i], value: 1000000000000 * (i + 1)});
    }

    // voter1 for candidates[0]
    const envelop1 = await instance.compute_envelope(100, candidates[0], 1000);
    await instance.cast_envelope(envelop1, { from: accounts[2 + numberOfCandidates + 1] });
    // voter2, candidates[1]
    const envelop2 = await instance.compute_envelope(200, candidates[1], 200);
    await instance.cast_envelope(envelop2, { from: accounts[2 + numberOfCandidates + 2] });
    // voter3, candidates[2]
    const envelop3 = await instance.compute_envelope(300, candidates[2], 300);
    await instance.cast_envelope(envelop3, { from: accounts[2 + numberOfCandidates + 3] });
    // voter4, candidates[3]
    const envelop4 = await instance.compute_envelope(400, candidates[3], 400);
    await instance.cast_envelope(envelop4, { from: accounts[2 + numberOfCandidates + 4] }); 
    // voter5, candidates[4]
    const envelop5 = await instance.compute_envelope(500, candidates[4], 500);
    await instance.cast_envelope(envelop5, { from: accounts[2 + numberOfCandidates + 5] });

    await instance.open_envelope(100, candidates[0], { from: accounts[2 + numberOfCandidates + 1], value: 1000 });
    await instance.open_envelope(200, candidates[1], { from: accounts[2 + numberOfCandidates + 2], value: 200 });
    await instance.open_envelope(300, candidates[2], { from: accounts[2 + numberOfCandidates + 3], value: 300 });
    await instance.open_envelope(400, candidates[3], { from: accounts[2 + numberOfCandidates + 4], value: 400 });
    await instance.open_envelope(500, candidates[4], { from: accounts[2 + numberOfCandidates + 5], value: 500 });
    
    const result = await instance.mayor_or_sayonara();    
    truffleAssert.eventEmitted(result, 'NewMayor', (ev) => {
      return ev._candidate === candidates[0];
    });
  });



  it("Testing mayor_or_sayonara: NewMayor is candidate0 by votes, soul tied with candidate 2", async function() {
    let quorum = 5; // test quorum

    const instance = await DemocraticMayor.new(candidates, escrow, quorum);

    // candidate deposit souls
    for (let i = 0; i < candidates.length; i++) {
      await instance.add_deposit({from: candidates[i], value: 1000000000000 * (i + 1)});
    }

    // voter1 for candidates[0]
    const envelop1 = await instance.compute_envelope(100, candidates[0], 500);
    await instance.cast_envelope(envelop1, { from: accounts[2 + numberOfCandidates + 1] });
    // voter2, candidates[0]
    const envelop2 = await instance.compute_envelope(200, candidates[0], 500);
    await instance.cast_envelope(envelop2, { from: accounts[2 + numberOfCandidates + 2] });
    // voter3, candidates[1]
    const envelop3 = await instance.compute_envelope(300, candidates[1], 1000);
    await instance.cast_envelope(envelop3, { from: accounts[2 + numberOfCandidates + 3] });
    // voter4, candidates[2]
    const envelop4 = await instance.compute_envelope(400, candidates[2], 400);
    await instance.cast_envelope(envelop4, { from: accounts[2 + numberOfCandidates + 4] });
    // voter5, candidates[3]
    const envelop5 = await instance.compute_envelope(500, candidates[3], 500);
    await instance.cast_envelope(envelop5, { from: accounts[2 + numberOfCandidates + 5] });


    await instance.open_envelope(100, candidates[0], { from: accounts[2 + numberOfCandidates + 1], value: 500 });
    await instance.open_envelope(200, candidates[0], { from: accounts[2 + numberOfCandidates + 2], value: 500 });
    await instance.open_envelope(300, candidates[1], { from: accounts[2 + numberOfCandidates + 3], value: 1000 });
    await instance.open_envelope(400, candidates[2], { from: accounts[2 + numberOfCandidates + 4], value: 400 });
    await instance.open_envelope(500, candidates[3], { from: accounts[2 + numberOfCandidates + 5], value: 500 });
    
    const result = await instance.mayor_or_sayonara();    
    truffleAssert.eventEmitted(result, 'NewMayor', (ev) => {
      return ev._candidate === candidates[0];
    });
  });


  it("Testing mayor_or_sayonara: no NewMayor but DrawMayor, there is a tie (soul and votes) with candidates 1 and 2", async function() {
    let quorum = 5; // test quorum

    const instance = await DemocraticMayor.new(candidates, escrow, quorum);

    // candidate deposit souls
    for (let i = 0; i < candidates.length; i++) {
      await instance.add_deposit({from: candidates[i], value: 1000000000000 * (i + 1)});
    }

    // voter1 for candidates[0]
    const envelop1 = await instance.compute_envelope(100, candidates[0], 500);
    await instance.cast_envelope(envelop1, { from: accounts[2 + numberOfCandidates + 1] });
    // voter2, candidates[0]
    const envelop2 = await instance.compute_envelope(200, candidates[0], 500);
    await instance.cast_envelope(envelop2, { from: accounts[2 + numberOfCandidates + 2] });
    // voter3, candidates[1]
    const envelop3 = await instance.compute_envelope(300, candidates[1], 300);
    await instance.cast_envelope(envelop3, { from: accounts[2 + numberOfCandidates + 3] });    
    // voter4, candidates[1]
    const envelop4 = await instance.compute_envelope(400, candidates[1], 700);
    await instance.cast_envelope(envelop4, { from: accounts[2 + numberOfCandidates + 4] });
    // voter5, candidates[3]
    const envelop5 = await instance.compute_envelope(500, candidates[3], 500);
    await instance.cast_envelope(envelop5, { from: accounts[2 + numberOfCandidates + 5] });

    await instance.open_envelope(100, candidates[0], { from: accounts[2 + numberOfCandidates + 1], value: 500 });
    await instance.open_envelope(200, candidates[0], { from: accounts[2 + numberOfCandidates + 2], value: 500 });
    await instance.open_envelope(300, candidates[1], { from: accounts[2 + numberOfCandidates + 3], value: 300 });
    await instance.open_envelope(400, candidates[1], { from: accounts[2 + numberOfCandidates + 4], value: 700 });
    await instance.open_envelope(500, candidates[3], { from: accounts[2 + numberOfCandidates + 5], value: 500 });
    
    const result = await instance.mayor_or_sayonara();    
    truffleAssert.eventEmitted(result, 'DrawMayor', (ev) => {
      return ev._candidates[0] === candidates[0] && ev._candidates[1] === candidates[1];
    });
  });


  it("Test call mayor_or_sayonara two time", async function() {
    let quorum = 3; // test quorum

    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
   
    // voter1 for candidates[0]
    const envelop1 = await instance.compute_envelope(100, candidates[0], 500);
    await instance.cast_envelope(envelop1, { from: accounts[2 + numberOfCandidates + 1] });
    // voter2, candidates[0]
    const envelop2 = await instance.compute_envelope(200, candidates[0], 500);
    await instance.cast_envelope(envelop2, { from: accounts[2 + numberOfCandidates + 2] });
    // voter3, candidates[0]
    const envelop3 = await instance.compute_envelope(300, candidates[0], 500);
    await instance.cast_envelope(envelop3, { from: accounts[2 + numberOfCandidates + 3] });
   
    await instance.open_envelope(100, candidates[0], { from: accounts[2 + numberOfCandidates + 1], value: 500 });
    await instance.open_envelope(200, candidates[0], { from: accounts[2 + numberOfCandidates + 2], value: 500 });
    await instance.open_envelope(300, candidates[0], { from: accounts[2 + numberOfCandidates + 3], value: 500 });

    const result = await instance.mayor_or_sayonara();
    truffleAssert.eventEmitted(result, 'NewMayor', (ev) => {
      return ev._candidate === candidates[0];
    });
    await truffleAssert.fails(instance.mayor_or_sayonara());
  });

  it("Test view functions", async function() {
    let quorum = 3; // test quorum
    let test_soul = 1000000000000;

    const instance = await DemocraticMayor.new(candidates, escrow, quorum);
    for (let i = 0; i < candidates.length; i++) {
      await instance.add_deposit({from: candidates[i], value: test_soul * (i + 1)});
    }

    const result_check_has_voted_false = await instance.check_has_voted(accounts[2 + numberOfCandidates + 1]);
    assert(result_check_has_voted_false == false, "The account did not vote, but it appears to be");

    // voter1 for candidates[0]
    const envelop1 = await instance.compute_envelope(100, candidates[0], 500);
    await instance.cast_envelope(envelop1, { from: accounts[2 + numberOfCandidates + 1] });

    // voter2, candidates[0]
    const envelop2 = await instance.compute_envelope(200, candidates[0], 500);
    await instance.cast_envelope(envelop2, { from: accounts[2 + numberOfCandidates + 2] });

    // voter3, candidates[0]
    const envelop3 = await instance.compute_envelope(300, candidates[0], 500);
    await instance.cast_envelope(envelop3, { from: accounts[2 + numberOfCandidates + 3] });
   
    await instance.open_envelope(100, candidates[0], { from: accounts[2 + numberOfCandidates + 1], value: 500 });
    await instance.open_envelope(200, candidates[0], { from: accounts[2 + numberOfCandidates + 2], value: 500 });
    await instance.open_envelope(300, candidates[0], { from: accounts[2 + numberOfCandidates + 3], value: 500 });

    const result_check_has_voted_true = await instance.check_has_voted(accounts[2 + numberOfCandidates + 1]);
    assert(result_check_has_voted_true, "The account has voted, but instead it seems not");

    const result_get_candidates = await instance.get_candidates();
    for (let i = 0; i < candidates.length; i++) {
      assert(result_get_candidates[i] == candidates[i], "List of candidates not recognize");
    }

    const result_get_candidate_soul = await instance.get_candidate_soul(candidates[0]);
    assert(result_get_candidate_soul.toString(10) == test_soul, "The soul of candidate has error");

    const result_get_condition = await instance.get_condition();
    const {0: cond_quorum, 1: cond_envelopes_casted, 2: cond_envelopes_opened} = result_get_condition;

    assert(cond_quorum == quorum, "The quorum condition is not recognize");
    assert(cond_envelopes_casted == 3, "The envelopes casted are not recognize");
    assert(cond_envelopes_opened == 3, "The envelopes opened are not recognize");


    const result_is_owner = await instance.is_owner({from: accounts[0]});
    assert(result_is_owner, "The user should be the owner, but it is not");
    const result_is_not_owner = await instance.is_owner({from: accounts[1]});
    assert(result_is_not_owner == false, "The user should not be the owner, but it is");


    const result_is_candidate = await instance.is_candidate({from: accounts[2]});
    assert(result_is_candidate, "The user should be a candidate, but it is not");
    const result_is_not_candidate = await instance.is_candidate({from: accounts[10]});
    assert(result_is_not_candidate == false, "The user should not be a candidate, but it is");
  });
  

});