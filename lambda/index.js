// This file is dual-licensed under MPL 2.0 and MIT - you can use the source form
// provided under the terms of either of those licenses.

var AWS = require('aws-sdk');
var llamaConfig = require('./config.json');
var rp = require('request-promise');

AWS.config.region = llamaConfig.region || 'eu-west-1';

exports.handler = function(event, context) {
console.log('Chaos Llama starting up');

if (llamaConfig.probability) {
  if (randomIntFromInterval(1,100) >= llamaConfig.probability && llamaConfig.probability != 100) {
    console.log('Probability says it is not chaos time');
    slackNotifier("warning", "Probability says it is not chaos time" )
      .finally(function(){
        return context.done(null, null);
      })
  }
}

var ec2 = new AWS.EC2();

ec2.describeInstances(function(err, data) {
  if (err) {
    return context.done(err, null);
  }

  if (!data || data.Reservations.length === 0) {
    console.log('No instances found, exiting.');
    slackNotifier("warning", "No instances found, exiting" )
      .finally(function(){
        return context.done(null, null);
      })
  }

  var candidates = [];
  data.Reservations.forEach(function(res) {
    res.Instances.forEach(function(inst) {
      inst.Tags.forEach(function(tag) {
        if (tag.Key === 'aws:autoscaling:groupName') {
          // this instance is in an ASG
          if (llamaConfig.enableForASGs) {
            // this takes precedence - if defined we don't even look at disableForASGs
            if (llamaConfig.enableForASGs.indexOf(tag.Value) !== -1) {
              candidates.push(inst);
            }
          } else {
            if (llamaConfig.disableForASGs) {
              if (llamaConfig.disableForASGs.indexOf(tag.Value) === -1) {
                candidates.push(inst);
              }
            }
          }
        }
      });
    });
  });

  console.log('candidates: %j', candidates);
  var numInstances = candidates.length;

  if (numInstances === 0) {
    console.log('No suitable instances found');
    slackNotifier("warning", "No suitable instance found" )
      .finally(function(){
        return context.done(null);
      })
  }

  var random = Math.floor(Math.random() * numInstances);
  var target = candidates[random];

  console.log('Going to terminate instance with id = %s', target.InstanceId);

  ec2.terminateInstances({InstanceIds:[target.InstanceId]}, function(err, data) {
    if (err) {
      slackNotifier("terminate", ('Error terminating ' + target.InstanceId))
      .finally(function(){
        return context.done(err, null);
      })
    }

    console.log('Instance %s terminated', target.InstanceId);
    slackNotifier("terminate", ('Instance %s terminated', target.InstanceId))
      .finally(function(){
        return context.done(null, data);
      })
  });
});
};

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function slackNotifier(type, message){
  var color;
  if ('type' == 'warning'){
    var color = '#ffff00';
  }
  else{
    var color = "#ff0000";
  }
  var options = {
    uri:url,
    body:{
        "username": "chaos-llama",
          "icon_emoji": ":ghost:",
          "text": "Terminating Instance",	
          "attachments": [
              {
                  "color": color,
                  "text": instanceId
              }
          ]}
  }
  if (typeof(llamaConfig.slackUrl) !== 'undefined' && llamaConfig.slackUrl){
    return rp(options);
  }else{
    return new Promise.resolve();
  }
    
}
