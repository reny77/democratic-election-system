App = {

    contracts: {},
    web3Provider: null,             // Web3 provider
    url: 'http://0.0.0.0:8545',     // Url for web3
    account: '0x0',                 // current ethereum account
    latestblockNumber: 0,           // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs

    init: function() {
        return App.initWeb3();
    },

    /* initialize Web3 */
    initWeb3: function() {
                
        if(typeof web3 != 'undefined') {
            App.web3Provider = window.ethereum;
            web3 = new Web3(App.web3Provider);
            try {
                ethereum.enable().then(async() => {
                    console.log("DApp connected to Metamask");
                });
            }
            catch(error) {
                console.log(error);
            }
        } else {
            App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
            web3 = new Web3(App.web3Provider);
        }

        return App.initContract();
    },

    initContract: function() {
        // Get current account
        web3.eth.getCoinbase(function(err, account) {
            if (err == null) {
                App.account = account;
            }
        });
        // avoid load last event emeted 
        // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
        web3.eth.getBlockNumber(function (error, result) {
            if (!error) {
                latestblockNumber = result;
            }
        });

        // Load content's abstractions
        $.getJSON("DemocraticMayor.json").done(function(c) {        
            App.contracts["Contract"] = TruffleContract(c);
            App.contracts["Contract"].setProvider(App.web3Provider);
            return App.listenForEvents();
        });
    },

    // Write an event listener
    listenForEvents: function() {

        App.contracts["Contract"].deployed().then(async (instance) => {
            // click is the Solidity event// If event has parameters: event.returnValues.valueName
            instance.CandidateDeposit(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                        $('#infoModalCenter').modal('hide');
                    }
                }
            });
            instance.EnvelopeCast(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                        $('#infoModalCenter').modal('hide');
                    }
                }
            });
            instance.EnvelopeOpen(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                        $('#infoModalCenter').modal('hide');
                    }
                }
            });
            instance.NewMayor(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                        //$('#infoModalCenter').modal('hide');
                        console.log("NewMayor=" + result.args._candidate);
                    }
                }
            });
            instance.DrawMayor(function(error, result) {
                // https://ethereum.stackexchange.com/questions/57803/solidity-event-logs
                if (!error) {
                    if (result.blockNumber > latestblockNumber) {
                        latestblockNumber = result.blockNumber;
                        App.render();
                        $('#infoModalCenter').modal('hide');
                        console.log("DrawMayor=" + result.args._candidates);
                    }
                }
            });
        });
        return App.render();
    },
    // Get a value from the smart contract
    render: function() {
        // Get current account
        web3.eth.getCoinbase(function(err, account) {
            if (err == null) {
                App.account = account;
                $("#accountId").html(account);
            }
        });

        var candidatesRow = $('#candidatesRow');
        // empty candidates list
        candidatesRow.empty();
        var candidateTemplate = $('#candidateTemplate');
        App.contracts["Contract"].deployed().then(async (instance) => {
            const candidates = await instance.get_candidates();

            // retrive vote conditions and status, set display
            const result_get_condition = await instance.get_condition();
            const {0: cond_quorum, 1: cond_envelopes_casted, 2: cond_envelopes_opened} = result_get_condition;
            $("#quorumId").html(cond_quorum.toString());
            $("#envelopCastedId").html(cond_envelopes_casted.toString());
            $("#envelopOpenedId").html(cond_envelopes_opened.toString());

            // handle type of user connected in Metamask
            var is_owner = await instance.is_owner({from: App.account});


            var is_candidate = false;
            if (is_owner) {
                $("#roleId").html("Owner");

                // see results
                //TODO: const is_winner_checked = await instance.is_winner_checked();
                const is_winner_checked = true;
                if (is_winner_checked) {
                    $(".btn-see-result").removeClass('hide');
                    $(".btn-mayor-or-sayonara").addClass('hide'); // hide check result button
                } else if (cond_envelopes_casted.toString() == cond_envelopes_opened.toString()) {
                    $(".btn-mayor-or-sayonara").removeClass('hide'); // show check result button
                }
                /* else {
                    $(".btn-mayor-or-sayonara").addClass('hide'); // hide check result button
                }  */   

            } else {
                $(".btn-mayor-or-sayonara").addClass('hide');  // hide check result button
                is_candidate = await instance.is_candidate({from: App.account});
                if (is_candidate) {
                    $("#roleId").html("Candidate " + candidates.indexOf(App.account));
                } else {
                    $("#roleId").html("Citizen");
                }
            }

            const has_voted = await instance.check_has_voted(App.account);
            // render list of candidates
            for (let i = 0; i < candidates.length; i++) {
                const result_get_candidate_soul = await instance.get_candidate_soul(candidates[i]);

                const candidate_name = 'Candidate ' + i;

                candidateTemplate.find('img').attr('src', 'https://avatars.dicebear.com/api/micah/' + candidates[i] + '.svg');
                candidateTemplate.find('.panel-title').text(candidate_name);
                candidateTemplate.find('.candidate-symbol').text(candidates[i]);
                candidateTemplate.find('.candidate-deposit').text(result_get_candidate_soul.toString(10));
                               
                // handle button under candidates
                
                // deposit button
                if (is_candidate && candidates[i] == App.account && result_get_candidate_soul == 0) {
                    candidateTemplate.find('.btn-deposit-modal')
                                        .attr('data-address', candidates[i])
                                        .attr('data-name', candidate_name)
                                        .removeClass("hide");
                } else {
                    candidateTemplate.find('.btn-deposit-modal').addClass("hide");
                }

                // vote button
                if (cond_quorum.toString() != cond_envelopes_casted.toString()) {
                    candidateTemplate.find('.btn-vote-modal')
                                        .attr('data-address', candidates[i])
                                        .attr('data-name', candidate_name)
                                        .removeClass("hide");
                } else {
                    candidateTemplate.find('.btn-vote-modal').addClass("hide");
                }

                // open-envelop button
                if (cond_quorum.toString() == cond_envelopes_casted.toString() && cond_envelopes_casted.toString() != cond_envelopes_opened.toString() && !has_voted) {
                    candidateTemplate.find('.btn-open-envelop')
                                        .attr('data-address', candidates[i])
                                        .removeClass("hide");
                } else {
                    $(".btn-open-envelop").addClass('hide');
                }
                
                candidatesRow.append(candidateTemplate.html());
                
            }
        });
    },
    depositClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const result = await instance.add_deposit.sendTransaction({from: App.account, value: $('#deposit-soul').val()})
            .then(function(receipt) {
                $('#depositModal').modal('hide');
                $('#infoModalCenter').modal('show');
            });
        });
    },
    voteClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const envelop = await instance.compute_envelope($('#voter-sigil').val(), $('#candidate-address').val(), $('#voter-soul').val());
            const result = await instance.cast_envelope.sendTransaction(envelop, { from: App.account })
            .then(function(receipt) {                
                $('#voteModal').modal('hide');
                $('#infoModalCenter').modal('show');
            });
        });
    } ,
    openEvelopeClick: function() {
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const result = await instance.open_envelope($('#openenvelop-sigil').val(), $('#openenvelop-symbol').val(), { from: App.account, value: $('#openenvelop-soul').val() })
            .then(function(receipt){
                $('#openEnvelopModal').modal('hide');
                $('#infoModalCenter').modal('show');
            });;
        });
    },
    mayorOrSayonaraClick: function() {        
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const result = await instance.mayor_or_sayonara({ from: App.account}); 
        });
    },
    seeResult: function() {        
        App.contracts["Contract"].deployed().then(async(instance) =>{
            const result = await instance.mayor_or_sayonara({ from: App.account}); 
        });
    },
}

// handle change account on MetaMask
ethereum.on('accountsChanged', function (accounts) {
	const account = accounts[0];
    App.account = account;
    App.render();
});

$('#depositModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget);
    var address = button.data('address');
    var name = button.data('name');
    var modal = $(this);
    modal.find('.modal-title').text('New deposit to "' + name + '" at address' + address);
});

$('#voteModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget);
    var address = button.data('address');
    var name = button.data('name');
    var modal = $(this)
    modal.find('#candidate-address').val(address);
    modal.find('#vote-intro').text('Vote for "' + name + '" at address' + address);
});

$('#openEnvelopModal').on('show.bs.modal', function (event) {
    var button = $(event.relatedTarget);
    var address = button.data('address');
    var modal = $(this)
    modal.find('#openenvelop-symbol').val(address);
    modal.find('#vote-intro').text('Vote for "' + name + '" at address' + address);
});

// Call init whenever the window loads
$(function() {
    $(window).on('load', function () {
        App.init();
    });
});