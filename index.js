const axios = require('axios');
const fs = require('fs');
const path = require('path');
const login = require('./disme-fca/index');
require('./utils/index');
const config = require('./config.json');
const logger = require('./utils/logger');

// Import font and cooldown handlers
const { formatFont, font, userFontSettings } = require('./handle/font');
const { isOnCooldown } = require('./handle/cooldown');

global.formatFont = formatFont;

let appstate;
try {
  appstate = require('./appstate.json');
} catch (err) {
  console.log(formatFont("No appstate detected. Please sign in to generate a new session."));
  return;
}

global.heru = {
  ENDPOINT: "https://deku-rest-api.gleeze.com",
  admin: new Set(config.ADMINBOT),
  prefix: config.PREFIX,
  botName: config.BOTNAME
};

const commands = {};
const commandPath = path.join(__dirname, 'src', 'cmds');
try {
  const files = fs.readdirSync(commandPath);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const script = require(path.join(commandPath, file));
        commands[script.config.name] = script;
        logger.logger(formatFont(`Loaded command: ${script.config.name}`));
      } catch (e) {
        logger.warn(formatFont(`Failed to load command: ${file}\nReason: ${e.message}`));
      }
    }
  });
} catch (err) {
  logger.warn(formatFont(`Error reading command directory: ${err.message}`));
}

login({ appState: appstate }, (err, api) => {
  if (err) {
    console.error(formatFont('Error logging in:'), err);
    return;
  }
  startBot(api);
});

function startBot(api) {
  console.log(formatFont('Successfully logged in!'));

  api.listenMqtt(async (err, event) => {
    if (err) {
      console.error(formatFont('Error in MQTT listener:'), err);
      return;
    }

    if (event.type === "message" || event.type === "message_reply") {
      const message = event.body;
      const uid = event.senderID;
      const dateNow = Date.now();
      let commandName = message.split(' ')[0].toLowerCase();
      const args = message.split(' ').slice(1);
      const isPrefixed = commandName.startsWith(global.heru.prefix);

      if (isPrefixed) {
        commandName = commandName.slice(global.heru.prefix.length).toLowerCase();
      }

      const command = commands[commandName];
      const react = (emoji, event) => {
        api.setMessageReaction(emoji, event.messageID, () => {}, true);
      };
      const reply = (text, event) => {
        api.sendMessage(formatFont(text), event.threadID, event.messageID);
      };

      if (!command) {
        if (commandName === 'font') {
          if (args[0] === 'list') {
            const availableFonts = Object.keys(font).join(', ');
            return reply(`Available fonts: ${availableFonts}`, event);
          }
          if (args[0] === 'change' && args[1] && font[args[1]]) {
            userFontSettings.currentFont = args[1];
            return reply(`Font changed to: ${args[1]}`, event);
          }
          if (args[0] === 'enable') {
            userFontSettings.enabled = true;
            return reply('Font styling enabled.', event);
          }
          if (args[0] === 'disable') {
            userFontSettings.enabled = false;
            return reply('Font styling disabled.', event);
          }
          return reply('Invalid font command. Usage: font list, font change <fontName>, font enable, or font disable.', event);
        }

        if (message === 'prefix') {
          return reply(`⚙️ My prefix is: 》 ${global.heru.prefix} 《`, event);
        }
        if (message === global.heru.prefix) {
          return reply(`Hello there! that's my prefix. Type ${global.heru.prefix}help to see all commands.`, event);
        }
      }

      if (command) {
        if (command.config.prefix !== false && !isPrefixed) {
          react('⚠️', event);
          return reply(`The Command "${commandName}" needs a prefix.`, event);
        }
        if (command.config.prefix === false && isPrefixed) {
          react('⚠️', event);
          return reply(`The command "${commandName}" doesn't need a prefix.`, event);
        }
        if (command.config.role === 1 && !global.heru.admin.has(event.senderID)) {
          react('⚠️', event);
          return reply(`You are not authorized to use the command "${commandName}".`, event);
        }

        // Check for cooldown before running command
        const cooldownTime = isOnCooldown(commandName, uid, command.config.cooldown * 1000 || 3000);
        if (cooldownTime) {
          return reply(`⏳ Command still on cooldown for ${cooldownTime.toFixed(1)} second(s).`, event);
        }

        try {
          await command.run(api, event, args, reply, react);
        } catch (error) {
          react('⚠️', event);
          reply(`Error executing command '${commandName}': ${error.message}`, event);
        }
      }
    } else if (event.type === 'event' && event.logMessageType === 'log:subscribe') {
      const { threadID } = event;
      const threadInfo = await api.getThreadInfo(threadID);
      const { threadName, participantIDs } = threadInfo;

      if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
        api.changeNickname(
          formatFont(`${global.heru.botName} • » ${global.heru.prefix} «`),
          event.threadID,
          api.getCurrentUserID()
        );

        api.shareContact(
          formatFont("✅ Connected successfully. Type \"" + global.heru.prefix + " help\" to see all commands."),
          api.getCurrentUserID(),
          event.threadID
        );
      }
    }
  });
}
