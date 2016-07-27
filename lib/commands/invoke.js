'use strict';

var aws = require('aws-sdk');
var yargs = require('yargs');
var chalk = require('chalk');
var debug = require('debug')('command:invoke');
aws.config.update({
  region: process.env.AWS_REGION || 'eu-west-1'
});


module.exports = invoke;

function invoke(yargs, argv) {
  var argv2 = yargs
        .usage('Usage: $0 invoke [options]')
        .option('g', {
          description: 'group -AutoScalingGroupName',
          type: 'string'
        })
        .argv;
  
  if (!process.env.AWS_REGION) {
    console.log(chalk.yellow('AWS_REGION not set, defaulting to eu-west-1'));
  }

  if (!process.env.AWS_PROFILE) {
    console.log(chalk.red('AWS_PROFILE not set'));
    console.log('Please add AWS IAM user credentials to ~/.aws/credentials and specify the profile to use with the AWS_PROFILE environment variable');
    return;
  }
  var lambda = new aws.Lambda({apiVersion: '2015-03-31'});
  
  if (typeof(argv.g) !== 'undefined'){
    var payload = JSON.stringify({"InvokeType":"CommandLine"})
  }else{
    var payload = JSON.stringify({"InvokeType":"CommandLine", "AutoScalingGroup": argv.g})
  }
  
  var params = {
    FunctionName: 'chaosLlama', /* required */
    InvocationType: 'RequestResponse',
    LogType: 'None',
    Payload: payload,
    Qualifier: 'STRING_VALUE'
  };
  lambda.invoke(params, function(err, data) {
  if (err) console.log(chalk.red(err, err.stack)); // an error occurred
  else     console.log(chalk.green((data));           // successful response
});
}