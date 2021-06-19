const truffleAssert = require('truffle-assertions');

const Mayor = artifacts.require('Mayor')

contract("Testing MyContract", accounts => {
  let quorum = 8; // test quorum
  let testSoul = 1000; // a base test soul

  it("Test cast envelop", async function() {
    const instance = await Mayor.new(accounts[0], accounts[1], quorum);
    const envelops = await instance.compute_envelope(100, true, testSoul);
    const result = await instance.cast_envelope(envelops);
    truffleAssert.eventEmitted(result, "EnvelopeCast");
  });



  it("Test open_envelope without reaching quorum", async function() {
    const instance = await Mayor.new(accounts[0], accounts[1], quorum);
    const envelops = await instance.compute_envelope(100, true, testSoul);
    await instance.cast_envelope(envelops);
    await truffleAssert.fails(instance.open_envelope.call(100, true, { value: testSoul }));
  });



  it("Try open_envelope with quorum achievement", async function() {
    const instance = await Mayor.new(accounts[0], accounts[1], quorum);

    for (let i = 0; i < quorum; i++) {
      const envelops = await instance.compute_envelope(i, true, (i + 1) * testSoul);
      const result = await instance.cast_envelope(envelops, { from: accounts[i + 2] });

    }

    for (let i = 0; i < quorum; i++) {
      const result = await instance.open_envelope(i, true, { from: accounts[i + 2], value: (i + 1) * testSoul });
      truffleAssert.eventEmitted(result, "EnvelopeOpen");
    }

  });


  it("Test call mayor_or_sayonara without opening the envelopes", async function() {
    const instance = await Mayor.new(accounts[0], accounts[1], quorum);
    await truffleAssert.fails(instance.mayor_or_sayonara());
  });


  it("Test call mayor_or_sayonara with true doblon, say 'NewMayor'", async function() {
    const instance = await Mayor.new(accounts[0], accounts[1], quorum);
    for (let i = 0; i < quorum; i++) {
      const envelops = await instance.compute_envelope(i, true, (i + 1) * testSoul);
      await instance.cast_envelope(envelops, { from: accounts[i + 2] });
    }

    for (let i = 0; i < quorum; i++) {
      await instance.open_envelope(i, true, { from: accounts[i + 2], value: (i + 1) * testSoul });
    }
    const result = await instance.mayor_or_sayonara();
    truffleAssert.eventEmitted(result, "NewMayor");
  });



  it("Test call mayor_or_sayonara with false doblon, say 'Sayonara'", async function() {
    const instance = await Mayor.new(accounts[0], accounts[1], quorum);
    for (let i = 0; i < quorum; i++) {
      const envelops = await instance.compute_envelope(i, false, (i + 1) * testSoul);
      await instance.cast_envelope(envelops, { from: accounts[i + 2] });
    }

    for (let i = 0; i < quorum; i++) {
      await instance.open_envelope(i, false, { from: accounts[i + 2], value: (i + 1) * testSoul });
    }
    const result = await instance.mayor_or_sayonara();
    truffleAssert.eventEmitted(result, "Sayonara");
  });




  it("Test call mayor_or_sayonara two time", async function() {
    const instance = await Mayor.new(accounts[0], accounts[1], quorum);
    for (let i = 0; i < quorum; i++) {
        const envelops = await instance.compute_envelope(i, false, (i + 1) * 1000);
        await instance.cast_envelope(envelops, {from: accounts[i + 2]});
    }

    for (let i = 0; i < quorum; i++) {
        await instance.open_envelope(i, false, {from: accounts[i + 2], value: (i + 1) * 1000});
    }
    const result = await instance.mayor_or_sayonara();
    truffleAssert.eventEmitted(result, "Sayonara");
    await truffleAssert.fails(instance.mayor_or_sayonara());
  });






});