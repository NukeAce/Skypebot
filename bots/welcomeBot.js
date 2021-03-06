// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// Import required Bot Framework classes.
// add CardFactory and ActionType for info cards

const { ActivityHandler, TurnContext } = require('botbuilder');
const nagMessage = require('../index.js');
// Welcomed User property name
const CONVERSATION_DATA_PROPERTY = 'conversationData';
var rTimeout = null;
var nestedTimeout = null;
const WELCOMED_USER = 'welcomedUserProperty';
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
        this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
        // The state management objects for the conversation and user state.
        this.conversationState = conversationState;

        this.onConversationUpdate(async (context, next) => {
            this.addConversationReference(context.activity);
            await next();
        });

        this.onMessage(async (context, next) => { //  this is an event listener that fires when the user sends the bot a message
            // Read UserState. If the 'DidBotWelcomedUser' does not exist (first time ever for a user)
            // set the default to false.
            this.addConversationReference(context.activity);
            const didBotWelcomedUser = await this.welcomedUserProperty.get(context, false);

            // Your bot should proactively send a welcome message to a personal chat the first time
            // (and only the first time) a user initiates a personal chat with your bot.
            if (didBotWelcomedUser === false) {
                // The channel should send the user name in the 'From' object
                const userName = context.activity.from.name;
                await context.sendActivity(`Welcome ${ userName } to the Nag Bot. If you want to get nagged with a message type 'start', if you want to stop receiving the message type 'stop'`);

                // Set the flag indicating the bot handled the user's first message.
                await this.welcomedUserProperty.set(context, true);
            } else {
                // This example uses an exact match on user's input utterance.
                // Consider using LUIS or QnA for Natural Language Processing.
                const text = context.activity.text.toLowerCase();// this takes the message and  converts it to a lowercase string
                // start here
                switch (text) {
                case 'start':
                    await context.sendActivity('I will start nagging you. To cancel at any point type \'stop\'');
                    rTimeout = setTimeout(async function run() {
                        await nagMessage.nag();// change message at the bottom of index.js
                        nestedTimeout = setTimeout(run, 5000);
                    }, 5000);
                    break;
                case 'stop':
                    clearTimeout(nestedTimeout);
                    clearTimeout(rTimeout);
                    await context.sendActivity('I will leave you alone now. To resume getting nagged type start');
                    break;
                default:
                    // eslint-disable-next-line quotes
                    await context.sendActivity(`If you want to get nagged with a message type 'start', if you want to stop getting nagged type 'stop`);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
        // Sends welcome messages to conversation members when they join the conversation.
        // Messages are only sent to conversation members who aren't the bot.
        this.onMembersAdded(async (context, next) => {
            // Iterate over all new members added to the conversation
            for (const idx in context.activity.membersAdded) {
                // Greet anyone that was not the target (recipient) of this message.
                // Since the bot is the recipient for events from the channel,
                // context.activity.membersAdded === context.activity.recipient.Id indicates the
                // bot was added to the conversation, and the opposite indicates this is a user.
                if (context.activity.membersAdded[idx].id !== context.activity.recipient.id) {
                    await context.sendActivity('Welcome');
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
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

    // async sendIntroCard(context) {
    //     const card = CardFactory.heroCard(
    //         'Welcome to Nag Bot balance checker!',
    //         'Welcome to Paystack Nagbot.',
    //         ['https://aka.ms/bf-welcome-card-image'],
    //         [
    //             {
    //                 type: ActionTypes.OpenUrl,
    //                 title: 'Open your dashboard',
    //                 value: 'https://dashboard.paystack.com'
    //             },
    //             {
    //                 type: ActionTypes.OpenUrl,
    //                 title: 'Ask a question on twitter',
    //                 value: 'https://twitter.com/paystack'
    //             },
    //             {
    //                 type: ActionTypes.OpenUrl,
    //                 title: 'View docs',
    //                 value: 'https://developers.paystack.co/reference'
    //             }
    //         ]
    //     );

    //     await context.sendActivity({ attachments: [card] });
    // }
}

module.exports.WelcomeBot = WelcomeBot;
