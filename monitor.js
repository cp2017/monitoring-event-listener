/*
 Libraries
 */
const chalk = require('chalk');
const inquirer = require('inquirer');
const Web3 = require('web3');
const http = require('http');

/*
 Variables
 */
let ethereumProvider;
let accountPassword;
let web3;
let contractAddress;
let abi;
let contract;
let event;
let parametersProvided = false;

module.exports = {
    startCli: () => {
        console.log("You did not provide the arguments (ethereumProvider, password, contractAddress, contractAbi).");
        initEthereum();
    },
    processArguments: (provider, password, contractAdd, contractAbi) => {
        console.log('Everything provided as arguments');
        accountPassword = password;
        ethereumProvider = provider;
        contractAddress = "0x" + contractAdd;
        abi = JSON.parse(contractAbi);
        parametersProvided = true;
        initEthereum();
    }
};

/********************************************************************
 1. Ask for the etherum client address and initialize the web3 library
 *******************************************************************/
function initEthereum() {
    if (!parametersProvided) {
        getEthereumProviderFromCli(getWeb3);
    } else {
        getWeb3();
    }
}

/**
 * Connect to the ethereum client
 */
function getWeb3() {
    if (!parametersProvided) {
        accountPassword = arguments[0].password;
        ethereumProvider = arguments[0].ethereumProvider;
    }

    web3 = new Web3(new Web3.providers.HttpProvider(ethereumProvider));
    web3.eth.getBlock('latest', (error, result) => {
        if (!error) {
            web3.eth.defaultAccount = web3.eth.accounts[0];
            // check if password is ok by unlocking the account
            unlockDefaultAccount();
        }
        else {
            console.error(chalk.red("Wrong ethereum client address!"));
            if (!parametersProvided) {
                initEthereum();
            } else {
                // TODO exit
                console.log("exit");
            }
        }
    });
}

/**
 * Unlocks the default account of the ethereum client
 */
function unlockDefaultAccount() {
    web3.personal.unlockAccount(web3.eth.defaultAccount, accountPassword, 999, ((error, result) => {
        if (!error) {
            initContract();
        }
        else {
            console.error(chalk.red("Wrong ethereum password!"));
            if (!parametersProvided) {
                initEthereum();
            } else {
                // TODO exit
                console.log("exit");
            }
        }
    }));
}

/********************************************************************
 2. Ask for the contract address, abi and for the name of the event that we want to subscribe to
 *******************************************************************/
function initContract() {
    if (!parametersProvided) {
        getContractArgumentsFromCli(getContract);
    } else {
        getContract();
    }
}

function getContract() {
    if (!parametersProvided) {
        try {
            contractAddress = arguments[0].contractAddress;
            abi = JSON.parse(arguments[0].contractAbi);
            web3.personal.unlockAccount(web3.eth.defaultAccount, accountPassword, 9999, eventListener);
        } catch (err) {
            console.error(chalk.red("Couldn't process the arguments. Please check contract address, abi and event name!"));
            if (!parametersProvided) {
                initContract();
            } else {
                // TODO exit
                console.log("exit");
            }
        }
    } else {
        web3.personal.unlockAccount(web3.eth.defaultAccount, accountPassword, 9999, eventListener);
    }
}

/********************************************************************
 3. Listen to the event of the contract
 *******************************************************************/
function eventListener(error, result) {
    if (!error && result) {
        contract = web3.eth.contract(abi).at(contractAddress);
        subscribeNewMonitorRecordEvent();
        subscribeJobMonitorEvent();
    }
    else {
        console.error(chalk.red(error));
    }
}


/**
 * Registering an event listener to the newMonitorRecord event of the monitoring-contract
 */
function subscribeNewMonitorRecordEvent() {
    try {
        event = contract.newMonitorRecord();
        console.log("Subscribing to newMonitorRecord");
        //    console.log(event);
        event.watch((error, eventResult) => {
            // This is the actual event listener
            if (error) {
                console.error(chalk.red("event error:"));
                console.error(chalk.red(error));
            } else {
                // console.log(eventResult);
                console.log("New monitoring jobs available");
                contract.getMonitorRequest({gas: 5000000}, (getMonitorRequestError, getMonitorRequestRes) => {
                    if (getMonitorRequestError || !getMonitorRequestRes) {
                        console.error(chalk.red("Get monitor request"));
                        console.error(chalk.red(getMonitorRequestError));
                    } else {
                        console.log("Asking the contract for a job: Get monitor request called");
                        console.log("Transaction hash: " + getMonitorRequestRes)
                    }
                })
            }
        });
    }
    catch (err) {
        console.error(chalk.red("Couldn't process the arguments. Please check contract address, abi and event name!"));
        if (!parametersProvided) {
            initContract();
        } else {
            // TODO exit
            console.log("exit");
        }
    }
}

/**
 * Registering an event listener to the jobMonitorEvent event of the monitoring-contract
 */
function subscribeJobMonitorEvent() {
    try {
        jobMonitorEvent = contract.jobMonitorEvent();
        console.log("Subscribing to jobMonitorEvent");
        //   console.log(jobMonitorEvent);
        jobMonitorEvent.watch((jobMonitorEventError, jobMonitorEventResult) => {
            // This is the actual event listener
            if (jobMonitorEventError || !jobMonitorEventResult) {
                console.error(chalk.red("job monitor event error:"));
                console.error(chalk.red(jobMonitorEventError));
            } else {
                if (jobMonitorEventResult.args.sender == web3.eth.defaultAccount) {
                    let jobIndex = jobMonitorEventResult.args.jobIndex.toString(10);
                    console.log("New job recieved. Index: " + jobIndex);
                    let monitorJob = contract.monitorJobs(jobMonitorEventResult.args.jobIndex.toString(10));
                    let monitorJobUrl = monitorJob[1];
                    if (!monitorJobUrl) {
                        console.error(chalk.red("Monitor job error: it does not contain an endpoint URL."));
                    } else {
                        monitorEndpoint(monitorJobUrl + "/monitor", jobIndex);
                    }
                }
            }
        });
    }
    catch (jobErr) {
        console.error(chalk.red("Error!"));
        if (!parametersProvided) {
            initContract();
        } else {
            // TODO exit
            console.log("exit");
        }
    }
}

/************************************************************************
 * The actual monitoring function
 *************************************************************************/
/**
 * This function monitors the endpoint for a certain time period and calls a function of the monitoring contract
 * to write back the result in percent of availability over the monitored time period.
 * @param monitorJobUrl The endpoint that needs to be monitored
 * @param jobIndex The monitoring job id that was provided when the contract gave us the job
 */
// TODO To check whether the user is authorized to use this endpoint, it would be nice if
// TODO the contract passes a (by the user) pre-signed message to the monitor.
function monitorEndpoint(monitorJobUrl, jobIndex) {
    console.log("Start monitoring: " + monitorJobUrl);
    // TODO the monitoring period should be set by the contract and not by the monitor itself
    // Monitoring for 30 minutes
    //  let testPeriod = 1800000;
    let testPeriod = 60000;
    // Monitoring interval: Test the endpoint every 5 seconds
    let testInterval = 5000;
    // Monitoring results
    let nuberRequests = 0;
    let numberSuccess = 0;

    // Call the endpoint every few seconds or whatever time the testInterval variable is set to.
    let monitoringInterval = setInterval(() => {
        nuberRequests++;
        http.get(monitorJobUrl, (res) => {
            const statusCode = res.statusCode;
            let error;
            if (statusCode !== 200) {
                error = new Error(`Request Failed.\n` +
                    `Status Code: ${statusCode}`);
            }
            if (error || !res) {
                console.error(chalk.red(error.message));
            } else {
                numberSuccess++;
            }
            res.resume();
        }).on('error', (e) => {
            console.error(chalk.red(`Got error: ${e.message}`));
        });
    }, testInterval);

    // After a certain time, stop the test interval and write back the result to the
    // monitoring contract
    setTimeout(() => {
        // Stop monitoring
        clearInterval(monitoringInterval);
        // and write back results
        let successRate = Math.round((numberSuccess / nuberRequests) * 100);
        contract.saveMonitoringResults(jobIndex, successRate, (resultError, resultSuccess) => {
            if (resultError || !resultSuccess) {
                console.error(chalk.red("saving monitoring results error:"));
                console.error(chalk.red(resultError));
            } else {
                console.log("Saved monitoring results: " + successRate + ", " + resultSuccess);
            }
        });
    }, testPeriod);
}

/**********************************************************************
 * Interactive CLI functions: In case the use did not provide parameters
 * on script start this functions can be used to input the parameters
 * interactively one after another.
 **********************************************************************/

// Ask for the ethereum client address and password of the default user
function getEthereumProviderFromCli(callback) {
    let questions = [
        {
            name: 'ethereumProvider',
            type: 'input',
            message: 'Enter your ethereum client address:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your username or e-mail address';
                }
            }
        },
        {
            name: 'password',
            type: 'password',
            message: 'Enter your ethereum user password:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter your password';
                }
            }
        }
    ];

    inquirer.prompt(questions).then(callback);
}

/**
 * Asks for the contract address of the MonitoringContract as well as for its ABI
 * @param callback Function that gets called when the questions are answered.
 */
function getContractArgumentsFromCli(callback) {
    let questions = [
        {
            name: 'contractAddress',
            type: 'input',
            message: 'Enter the address of the contract that you want to listen to:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter the address of the contract that you want to listen to';
                }
            }
        },
        {
            name: 'contractAbi',
            type: 'editor',
            message: 'Enter the ABI of the contract that you want to listen to:',
            validate: (value) => {
                if (value.length) {
                    return true;
                } else {
                    return 'Please enter the ABI of the contract that you want to listen to:';
                }
            }
        }
    ];

    inquirer.prompt(questions).then(callback);
}