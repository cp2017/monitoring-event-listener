/*
 Libraries
 */
const chalk = require('chalk');
const figlet = require('figlet');
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
let eventFunctionName;
let contract;
let event;
let parametersProvided = false;


module.exports = {

    startCli: () => {
        console.log("You did not provide the arguments (ethereumProvider, password, contractAddress, contractAbi, eventName).");
        initEthereum();
    },
    processArguments: (provider, password, contractAdd, contractAbi, eventName) => {
        console.log('Everything provided as arguments');
        accountPassword = password;
        ethereumProvider = provider;
        contractAddress = "0x" + contractAdd;
        abi = JSON.parse(contractAbi);
        eventFunctionName = eventName;
        parametersProvided = true;
        initEthereum();
    },
    printHeadline: () => {
        console.log(
            chalk.blue(
                figlet.textSync('Service Monitor', {horizontalLayout: 'full'})
            )
        );
    }

};

function initEthereum() {
    if (!parametersProvided) {
        getEthereumProviderFromCli(getWeb3);
    } else {
        getWeb3();
    }
}

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
            eventFunctionName = arguments[0].eventName;
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

function subscribeNewMonitorRecordEvent() {
    try {
        event = contract[eventFunctionName]();
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

                        monitorEndpoint(monitorJobUrl, jobIndex);
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
function monitorEndpoint(monitorJobUrl, jobIndex) {
    console.log("Start monitoring: " + monitorJobUrl);
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
 * CLI functions
 **********************************************************************/

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
        },
        {
            name: 'eventName',
            type: 'input',
            message: 'Enter the name of the event that you want to subscribe to:',
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