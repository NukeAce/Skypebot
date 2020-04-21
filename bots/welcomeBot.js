// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Import required Bot Framework classes.
const { ActionTypes, ActivityHandler, CardFactory, TurnContext } = require('botbuilder');
const balance = require('../index.js');
// Welcomed User property name
const CONVERSATION_DATA_PROPERTY = 'conversationData';
var rTimeout = null;
var nestedTimeout = null;

class WelcomeBot extends ActivityHandler {
    /**
     *
     * @param {UserState}  //state to persist boolean flag to indicate
     *                    if the bot had already welcomed the user
     */
    constructor(userState, conversationReferences, conversationState) {
        super();
        // Creates a new user property accessor.
        // See https://aka.ms/about-bot-state-accessors to learn more about the bot state and state accessors.
        this.userState = userState;
        this.conversationReferences = conversationReferences;
        this.conversationDataAccessor = conversationState.createProperty(CONVERSATION_DATA_PROPERTY);

        // The state management objects for the conversation and user state.
        this.conversationState = conversationState;

        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
            await context.sendActivity('Welcome to the Nag Bot. If you want to get nagged with your balance type \'ok\', if you want your balance alone type \'balance. for info type \'info\'');
            await next();
        });

        this.onMessage(async (context, next) => { //  this is an event listener that fires when the user sends the bot a message
            this.addConversationReference(context.activity);
            const text = context.activity.text.toLowerCase();// this takes the message and  converts it to a lowercase string
            // start here
            switch (text) {
            case 'hello':
                await context.sendActivity('I will retrieve your balance from the Paystack API, to cancel at any point type \'no\'');
                rTimeout = setTimeout(async function run() {
                    await balance.retrieveBalance();
                    nestedTimeout = setTimeout(run, 5000);
                }, 5000);
                break;
            case 'hi':
                await context.sendActivity(`You said "${ context.activity.text }"`);
                break;
            case 'no':
                clearTimeout(nestedTimeout);
                clearTimeout(rTimeout);
                break;
            case 'intro':
            case 'help':
                await this.sendIntroCard(context);
                break;
            default:
                await context.sendActivity(`This is a simple Welcome Bot sample. You can say 'intro' to
                                                    see the introduction card. If you are running this bot in the Bot
                                                    Framework Emulator, press the 'Start Over' button to simulate user joining a bot or a channel`);
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
        // Sends welcome messages to conversation members when they join the conversation.
        // Messages are only sent to conversation members who aren't the bot.
        // this.onMembersAdded(async (context, next) => {
        //     // Iterate over all new members added to the conversation
        //     for (const idx in context.activity.membersAdded) {
        //         // Greet anyone that was not the target (recipient) of this message.
        //         // Since the bot is the recipient for events from the channel,
        //         // context.activity.membersAdded === context.activity.recipient.Id indicates the
        //         // bot was added to the conversation, and the opposite indicates this is a user.
        //         if (context.activity.membersAdded[idx].id !== context.activity.recipient.id) {
        //             await context.sendActivity('Welcome to the Nag Bot. If you want to get nagged with your balance type \'ok\', if you want your balance alone type \'balance. for info type \'info\'');
        //         }
        //     }

        //     // By calling next() you ensure that the next BotHandler is run.
        //     await next();
        // });
    }

    /**
     * Override the ActivityHandler.run() method to save state changes after the bot logic completes.
     */
    async run(context) {
        await super.run(context);

        // Save state changes
        await this.userState.saveChanges(context);
        await this.conversationState.saveChanges(context, false);
    }

    addConversationReference(activity) {
        const conversationReference = TurnContext.getConversationReference(activity);
        this.conversationReferences[conversationReference.conversation.id] = conversationReference;
    }

    async sendIntroCard(context) {
        const card = CardFactory.heroCard(
            'Welcome to Nag Bot balance checker!',
            'Welcome to Paystack Nagbot.',
            ['https://aka.ms/bf-welcome-card-image'],
            [
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Open your dashboard',
                    value: 'https://dashboard.paystack.com'
                },
                {
                    type: ActionTypes.OpenUrl,
                    title: 'Ask a question on twitter',
                    value: 'https://twitter.com/paystack'
                },
                {
                    type: ActionTypes.OpenUrl,
                    title: 'View docs',
                    value: 'https://developers.paystack.co/reference'
                }
            ]
        );

        await context.sendActivity({ attachments: [card] });
    }
}

module.exports.WelcomeBot = WelcomeBot;
