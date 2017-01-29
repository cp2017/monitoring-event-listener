#!/usr/bin/env node
var cli = require('./cli-interface.js');
var argv = require('yargs').argv;
var fs = require('fs')

cli.printHeadline();
if (argv.ethereumProvider && argv.password && argv.contractAddress && argv.contractAbi && argv.eventName) {

    fs.readFile(argv.contractAbi , 'utf8', function (err,data) {
        if (err) {
            return console.log(err);
        }
        cli.processArguments(argv.ethereumProvider, argv.password, argv.contractAddress, data, argv.eventName);
    });


} else {
    cli.startCli();
}