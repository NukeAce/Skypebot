// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Import required packages
const path = require('path');
const restify = require('restify');
const axios = require('axios');

// Import required bot services.
// See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter, UserState, ConversationState, MemoryStorage } = require('botbuilder');
const { MicrosoftAppCredentials } = require('botframework-connector');
const { WelcomeBot } = require('./bots/welcomeBot');

// Read botFilePath and botFileSecret from .env file
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });
MicrosoftAppCredentials.trustServiceUrl('https://skype.botframework.com/');
// Create bot adapter.
// See https://aka.ms/about-bot-adapter to learn more about bot adapter.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppID,
    appPassword: process.env.MicrosoftAppPassword
});

// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights.
    console.error(`\n [onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );

    // Send a message to the user
    await context.sendActivity('The bot encountered an error or bug.');
    await context.sendActivity('To continue to run this bot, please fix the bot source code.');
};

// Define a state store for your bot. See https://aka.ms/about-bot-state to learn more about using MemoryStorage.
// A bot requires a state store to persist the dialog and user state between messages.

// For local development, in-memory storage is used.
// CAUTION: The Memory Storage used here is for local bot debugging only. When the bot
// is restarted, anything stored in memory will be gone.
const memoryStorage = new MemoryStorage();
const userState = new UserState(memoryStorage);
const conversationState = new ConversationState(memoryStorage);

// Create the main dialog.
const conversationReferences = {};
const bot = new WelcomeBot(userState, conversationReferences, conversationState);

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function() {
    console.log(`\n${ server.name } listening to ${ server.url }`);
    console.log('\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator');
    console.log('\nTo talk to your bot, open the emulator select "Open Bot"');
});

// Listen for incoming activities and route them to your bot main dialog.

server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (context) => {
        // route to main dialog.
        await bot.run(context);
    });
});

const getBalance = async () => {
    try {
        return await axios.get('https://api.paystack.co/balance', {
            headers: {
                Authorization: 'Bearer sk_test_ee6ffed0718d607063af1be81d911419bd4eb224'
            }
        });
    } catch (error) {
        if (error.response) {
            /*
             * The request was made and the server responded with a
             * status code that falls out of the range of 2xx
             */
            console.log(error.response.data);
            console.log(error.response.status);
            console.log(error.response.headers);
        } else if (error.request) {
            /*
             * The request was made but no response was received, `error.request`
             * is an instance of XMLHttpRequest in the browser and an instance
             * of http.ClientRequest in Node.js
             */
            console.log(error.request);
        } else {
            // Something happened in setting up the request and triggered an Error
            console.log('Error', error.message);
        }
        console.error(error);
    }
};
const retrieveBalance = async () => {
    const balance = await getBalance();
    if (balance !== undefined && balance.data.message !== undefined) {
        for (const conversationReference of Object.values(conversationReferences)) {
            MicrosoftAppCredentials.trustServiceUrl(conversationReference.serviceUrl);
            await adapter.continueConversation(conversationReference, async turnContext => {
                // If you encounter permission-related errors when sending this message, see
                // https://aka.ms/BotTrustServiceUrl
                await turnContext.sendActivity(balance.data.message);
            });
        }
    } else {
        for (const conversationReference of Object.values(conversationReferences)) {
            MicrosoftAppCredentials.trustServiceUrl(conversationReference.serviceUrl);
            await adapter.continueConversation(conversationReference, async turnContext => {
                // If you encounter permission-related errors when sending this message, see
                // https://aka.ms/BotTrustServiceUrl
                await turnContext.sendActivity('Unable to retrieve message at this moment. Check your connection');
            });
        }
    }
};

module.exports.retrieveBalance = retrieveBalance;
