// TODO: Comment
var file = require('./../utils/file.js');
var utils = require('./../utils/utils.js');

var firstConnect = true; // Used to make sure some things that need to be connected only get ran once
var botChannelId = "303706109238050819" // Teting channel
//var botChannelId = "299032114677022722"; // Channel for the Bot to put updates in
var botChannel = null;
var RR = file.loadJson("RR.json"); // load json file
// Set a few messages
var timeToResond = 5;
var timeToResondText = "5 minutes";
var ifThereMsg = "It is your turn for the RR please run \"?accept\" to accept, \"?deny\" to be moved to the end of the list, or \"?remove\" to be skiped and removed from the list. You will be skiped after " + timeToResondText + ".";
var endMessage = "Send me your when you are done used \"?done\" to add your writeing or you can use \"?deny\" or \"?remove\"."
// Setup Json
if (RR["note"] === undefined || RR["note"] == ""){
  RR["note"] = "Please write 3 sentences in 15 minutes that build on things people have written before you.";
}
if (RR["userList"] === undefined){
  RR["userList"] = [];
}

if (RR["userSettings"] === undefined){
  RR["userSettings"] = new Map();
}

if (RR["started"] === undefined){
  RR["started"] = false;
}

if (RR["paused"] === undefined){
  RR["paused"] = false;
}

if (RR["currentUser"] === undefined){
  RR["currentUser"] = null;
}

if (RR["index"] === undefined){
  RR["index"] = 0;
}

function save() {
  file.saveJson("RR.json", RR);
}

function listUsers(channel, msg){
  RR["userList"].forEach(function(i) { // Go through and add each username to message
    if (RR["userList"].indexOf(i) == 0){ // If it is the first just add the username
      msg += i.username;
    }else if (RR["userList"].indexOf(i) == RR["userList"].length - 1){ // else if it is the last add ", and " then username
      msg += ", and " + i.username;
    }else{ // Else it is one in the middle so just add comma and username
      msg += ", " + i.username;
    }
  });
  if (RR["userList"].length == 0){ // If list is empty say that.
    msg += "empty";
  }
  channel.send(msg + "."); // Send message and add period
}

function onReady(bot){
  if (firstConnect){ // Make sure this is the first connet
    botChannel = bot.channels.find(i => i.id === botChannelId); // Get the bot channel
  }
}

function onMessage(bot, message) {
  if(RR["currentUser"] == message.author.id&&RR.userList[RR["index"]]["accepted"] == true){
    RR.userList[RR["index"]]["text"].push(message.content);
  }
}

function userInList(user) {
  for (var i = 0; i < RR["userList"].length; i++) {
    if (RR["userList"][i]["user"] == user.id) {
      return true;
    }
  }
  return false;
}

function rrsettings(bot, argString, message) {
  if(argString == ""){
    if(RR["userSettings"][message.author.id] === undefined){
      message.channel.send("You settings have not been set. Set them with `?RRSettings <timezone> <writer name>`");
    }else {
      var msg = "```";
      msg += "\nWritername: " + RR["userSettings"][message.author.id]["name"];
      msg += "\nTimezone: " + RR["userSettings"][message.author.id]["timezone"];
      msg += "\n```";
      message.channel.send(msg);
    }
  }else {
    RR["userSettings"][message.author.id] = new Map();
    RR["userSettings"][message.author.id]["timezone"] = argString.split(" ")[0];
    RR["userSettings"][message.author.id]["name"] = argString.substring(argString.split(" ")[0].length+1);
    save();
    message.channel.send("Settings updated.");
  }
}

function add(bot, argString, message){ // Add the user to list
  if(RR["userSettings"][message.author.id] === undefined){
    message.channel.send("You settings have not been set. Set them with `?RRSettings <timezone> <writer name>`");
  }else {
    RR["userList"].push({user: message.author.id, username: message.author.username,  restrictions: argString});
    listUsers(botChannel, "Updated user list: ");
    save();
    message.channel.send("Added.");
  }
}

function addA(bot, argString, message) {
  var username = argString.split(" ")[0];
  var user = message.channel.members.find(i => i.user.username.toLowerCase() == username.toLowerCase());
  var i = 0;
  while (user === null) {
    i++;
    if (argString.split(" ").length < i){
      message.channel.send("User not found.");
      return;
    }
    username += " " + username.split(" ")[i];
    user = message.channel.members.find(i => i.user.username.toLowerCase() == username.toLowerCase());
  }
  if(RR["userSettings"][user.user.id] === undefined){
    message.channel.send("This users settings have not been set. Set them with `?RRSettings <timezone> <writer name>`");
  }else {
    RR["userList"].push({user: user.user.id, username: user.user.username, restrictions: argString.substring(username.length+1)});
    listUsers(botChannel, "Updated user list: ");
    save();
    message.channel.send("Added.");
  }
}

function list(bot, argString, message) {
  listUsers(message.channel, "User list: ");
}

async function remove(bot, argString, message) {
  if(RR["currentUser"] == message.author.id){
    RR["userList"].splice(RR["index"], 1);
    if(userList[RR["index"]]===undefined){
      next(bot);
    }
    listUsers(botChannel, "Updated user list: ");
    botChannel.send("Passing to " + RR.userList[RR["index"]].username + ".");
    (await bot.fetchUser(RR["userList"][RR["index"]]["user"])).send(ifThereMsg);
    RR["currentUser"] = RR["userList"][RR["index"]]["user"];
    RR["userList"][RR["index"]]["accepted"] = false;
    RR["userList"][RR["index"]]["text"] = [];
    save();
    timeout(bot, RR["userList"][RR["index"]]);
  }
  if(argString == ""){
    RR["userList"].forEach(function(i){
      if (i["user"] == message.author.id){
        RR["userList"].splice(RR["userList"].indexOf(i), 1);
      }
    });

    message.channel.send("Removed.");
    save();
  }else {
    for (var i = 0; i < RR["userList"].length; i++) {
      if (RR["userList"][i].username.toLowerCase() == argString.toLowerCase()){
        RR["userList"].splice(i, 1);
        listUsers(botChannel, "Updated user list: ");
        message.channel.send("Removed.");
        save();
        return;
      }
    }
    message.channel.send("User not found.");
  }
}

function move(bot, argString, message) {
  var username = argString.toLowerCase().split(" ");
  username.splice(-1,1);
  username = username.join(" ");
  for (var i = 0; i < RR["userList"].length; i++) {
    if (RR["userList"][i].username.toLowerCase() == username){
      utils.move(RR["userList"], 0, parseInt(argString.split(" ")[argString.split(" ").length-1])-1);
      listUsers(botChannel, "Updated user list: ");
      message.channel.send("Moved.");
      save();
      return;
    }
  }
  message.channel.send("User not found.");
}

async function timeout(bot, user){
  setTimeout(async function(userId) {
    if(userId == RR["currentUser"]&&[RR["index"]]["accepted"] == false&&!RR["paused"]){
      (await bot.fetchUser(RR["userList"][RR["index"]]["user"])).send("You took too long if this is the first you missed it you will be moved to the end.");
      botChannel.send(RR["userList"][RR["index"]]["username"] + "took too long passing on.");
      if (!user["alreadyTimedout"]){
        user["alreadyTimedout"] == true;
        utils.move(RR["userList"], RR["index"], RR["userList"].length - 1);
      }else{
        RR["userList"].splice(RR["index"], 1);
        if(userList[RR["index"]]===undefined){
          next(bot);
        }
      }
      listUsers(botChannel, "Updated user list: ");
      botChannel.send("Passing to " + RR.userList[RR["index"]].username + ".");
      (await bot.fetchUser(RR["userList"][RR["index"]]["user"])).send(ifThereMsg);
      RR["currentUser"] = RR["userList"][RR["index"]]["user"];
      RR["userList"][RR["index"]]["accepted"] = false;
      RR["userList"][RR["index"]]["text"] = [];
      save();
      timeout(bot, RR["userList"][RR["index"]]);
    }
  }, timeToResond*60000, bot, user);
}

async function next(bot) {
  if (RR["index"] < RR.length){
    botChannel.send(RR["userList"][RR["index"]].username + " is done passing to " + userList[RR["index"]+1].username + ".");
    RR["index"]++;
    (await bot.fetchUser(RR["userList"][RR["index"]]["user"])).send(ifThereMsg);
    RR["currentUser"] = RR["userList"][RR["index"]]["user"];b
    RR["userList"][RR["index"]]["accepted"] = false;
    RR["userList"][RR["index"]]["text"] = [];
    save();
    timeout(bot, RR["userList"][RR["index"]]);
  }else{
    botChannel.send("RR done sending to Riza.");
    var userDM = await bot.fetchUser("268795277970767882");
    var msg = "";
    for (var i = 0; i < RR["index"]+1; i++) {
      for (var j = 0; j < RR.userList[i]["text"].length; j++) {
        if("\n"+RR.userList[i]["text"][j]+msg>2000){
          userDM.send(msg);
          msg = "";
        }
        msg += "\n" + RR.userList[i]["text"][j];
      }
    }
    userDM.send(msg);
    RR["note"] = "Please write 3 sentences in 15 minutes that build on things people have written before you.";
    RR["userList"] = [];
    RR["started"] = false;
    RR["paused"] = false;
    RR["currentUser"] = null;
    RR["index"] = 0;
    save();
  }
}

async function start(bot, argString, message) {
  if(!RR["started"]){
    RR["started"] = true;
    if (RR["currentUser"] === null) {
        botChannel.send(message.author.username+" has started the RR " + RR["userList"][0].username + " will start.");
        (await bot.fetchUser(RR["userList"][0]["user"])).send(ifThereMsg);
        RR["currentUser"] = RR["userList"][0]["user"];
        RR["userList"][0]["accepted"] = false;
        RR["userList"][0]["alreadyTimedout"] = false;
        RR["userList"][0]["text"] = [];
        RR["index"] = 0;
        save();
        message.channel.send("Started.");
        timeout(bot, RR["userList"][0]);
    }
  }
}

function pause(bot, argString, message) {
  if (RR["paused"]){
    message.channel.send("Unpaused. Will now timeout people.");
    RR["paused"] = false;
  }else {
    message.channel.send("Paused. Will not timeout people till someone unpauses.");
    RR["paused"] = true;
  }
 save();
}

function accept(bot, argString, message) {
  var msg = "";
  botChannel.send(message.author.username+" has accepted.");
  RR.userList[RR["index"]]["accepted"] = true;
  for (var i = 0; i < RR["index"]+1; i++) {
    for (var j = 0; j < RR.userList[i]["text"].length; j++) {
      if("\n"+RR.userList[i]["text"][j]+msg>2000){
        message.author.send(msg);
        msg = "";
      }
      msg += "\n" + RR.userList[i]["text"][j];
    }
  }
  message.author.send(msg);
  message.author.send(RR["note"]);
  message.author.send(endMessage);
}

async function deny(bot, argString, message) {
  botChannel.send(message.author.username+" has denied.");
  message.channel.send("You have been moved to the end.");
  utils.move(RR["userList"], RR["index"], RR["userList"].length - 1);
  listUsers(botChannel, "Updated user list: ");
  botChannel.send("Passing to " + RR.userList[RR["index"]].username + ".");
  (await bot.fetchUser(RR["userList"][RR["index"]]["user"])).send(ifThereMsg);
  RR["currentUser"] = RR["userList"][RR["index"]]["user"];
  RR["userList"][RR["index"]]["accepted"] = false;
  RR["userList"][RR["index"]]["text"] = [];
  save();
  timeout(bot, RR["userList"][RR["index"]]);
}

async function done(bot, argString, message) {
  RR.userList[RR["index"]]["text"].push(argString);
  message.channel.send("Added thank you.");
  await next(bot);
}

module.exports = {
  name: "Round Robbin",
  description: "The Round Robin is where we get a list of names of people who want to join the robin. Depending on the amount of people we usually have each person write 3 sentences in 15 minutes then pass it on to the bot. Rizapheonyxx usually goes through it for grammar errors.",
  onReady: onReady,
  onMessage: onMessage,
  commands:[
    {
      description: "Settings for the RR.",
      command: "RRSettings",
      argModes: ["none", "after"],
      args: ["timezone", "writer name"],
      dm: true,
      channel: true,
      rank: "@everyone",
      otherReqs: [],
      function: rrsettings
    },
    {
      description: "Adds you to the RR list",
      command: "add",
      argModes: ["after", "none"],
      args: ["time restrictions"],
      dm: false,
      channel: true,
      rank: "@everyone",
      otherReqs: [function(argString, message) {
        if(userInList(message.author)){ // Make sure user is not already in the list
          message.channel.send("You are already in the list.");
          return false;
        }
        return true;
      }],
      function: add
    },
    {
      description: "Add someone to the RR list.",
      command: "addA",
      argModes: ["after"],
      args: ["username> <time restrictions(optional)"],
      dm: false,
      channel: true,
      rank: "hydra heads",
      otherReqs: [],
      function: addA
    },
    {
      description: "Shows the users in the list.",
      command: "list",
      argModes: ["none"],
      args: [],
      dm: false,
      channel: true,
      rank: "hydra heads",
      otherReqs: [],
      function: list
    },
    {
      description: "Remove your self or someone else from the list.",
      command: "remove",
      argModes: ["none", "after"],
      args: ["username"],
      dm: true,
      channel: true,
      rank: "@everyone",
      otherReqs: [function(argString, message) {
        if(argString != ""){
          if(utils.atAboveRole(message, "hydra heads")){
            return true;
          }
          // TODO: Add perm error
          return false;
        }else {
          var found = false;
          RR["userList"].forEach(function(i){
            if (i["user"].id == message.author.id){
              found = true;
            }
          });
          return found;
        }
      }],
      function: remove
    },
    {
      description: "Moves someone that is in the list.",
      command: "move",
      argModes: ["after"],
      args: ["username", "slot number"],
      dm: false,
      channel: true,
      rank: "hydra heads",
      otherReqs: [function(argString, message) {
          if (isNaN(argString.split(" ")[argString.split(" ").length-1])){ // If arg is not int return error
            message.channel.send("`" + argString.split(" ")[argString.split(" ").length-1] + "` is not a number.");
            return false;
          }else if(parseInt(argString.split(" ")[argString.split(" ").length-1]) > RR.userList.length){
            message.channel.send("`" + argString.split(" ")[argString.split(" ").length-1] + "` is too big max is `"+RR.userList.length+"`.");
            return false;
          }
          return true;
        }],
      function: move
    },
    {
      description: "Starts the RR.",
      command: "startRR",
      argModes: ["none"],
      args: [],
      dm: false,
      channel: true,
      rank: "hydra heads",
      otherReqs: [],
      function: start
    },
    {
      description: "Stops timeingout people.",
      command: "pauseRR",
      argModes: ["none"],
      args: [],
      dm: false,
      channel: true,
      rank: "hydra heads",
      otherReqs: [],
      function: pause
    },
    {
      description: "Accept the RR.",
      command: "accept",
      argModes: ["none"],
      args: [""],
      dm: true,
      channel: false,
      rank: "@everyone",
      otherReqs: [function(argString, message) {
        if(RR["currentUser"] == message.author.id&&RR.userList[RR["index"]]["accepted"] == false) return true;
        return false;}],
      function: accept
    },
    {
      description: "Deny the RR.",
      command: "deny",
      argModes: ["none"],
      args: [""],
      dm: true,
      channel: false,
      rank: "@everyone",
      otherReqs: [function(argString, message) {
        if(RR["currentUser"] == message.author.id) return true;
        return false;}],
      function: deny
    },
    {
      description: "Add your writing.",
      command: "done",
      argModes: ["none","after"],
      args: ["writing"],
      dm: true,
      channel: false,
      rank: "@everyone",
      otherReqs: [function(argString, message) {
        if(RR["currentUser"] == message.author.id&&RR.userList[RR["index"]]["accepted"]) return true;
        return false;}],
      function: done
    }
  ]
}
