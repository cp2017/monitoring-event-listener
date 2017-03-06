#!/usr/bin/env node

// imports
const monitor = require('./monitor.js');
const argv = require('yargs').argv;
const fs = require('fs');
const chalk = require('chalk');
const figlet = require('figlet');

// Print headline on script start
console.log(
    chalk.blue(
        figlet.textSync('Service Monitor', {horizontalLayout: 'full'})
    )
);

// If everything is provided as parameters, try to parse everything ...
if (argv.ethereumProvider && argv.password && argv.contractAddress && argv.contractAbi) {

    fs.readFile(argv.contractAbi , 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        monitor.processArguments(argv.ethereumProvider, argv.password, argv.contractAddress, data);
    });

// ... if the user didn't provide the needed parameters, start the interactive CLI
} else {
    monitor.startCli();
}