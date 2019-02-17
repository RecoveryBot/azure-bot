// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// bot.js is your bot's main entry point to handle incoming activities.

const { ActivityTypes, MessageFactory } = require('botbuilder');
const { LuisRecognizer } = require('botbuilder-ai');

const WELCOMED_USER = 'welcomedUserProperty';
const CONVERSATION_FLOW_PROPERTY = 'conversationFlowProperty';
const CONVERSATION_FLOW_PROPERTY2 = 'conversationFlowProperty2';
const USER_PROFILE_PROPERTY = 'userProfileProperty';

var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;


// Identifies the last question asked.
const question = {
    name: "name",
    none: "none",
    drug: "drug",
    concern: "concern",
    difficult: "difficult",
    goal: "goal",
    action: "action"
}

const question2 = {
    feeling: "feeling",
    none: "none",
    recap: "recap",
    recap2: "recap2",
    concernCorrection: "concernCorrection",
    scenario: "scenario",
    explain: "explain",
    different: "different",
    scenario2: "scenario2",
    result: "result",
    call: "call",
    phone: "phone"

}

class EchoBot {
    /**
     *
     * @param {ConversationState} conversation state object
     * @param {UserState} user state object
     * @param {luisApplication} 
     * @param {luisPredictionOptions}
     */
    constructor(conversationState, userState, luisApplication, luisPredictionOptions) {
        this.conversationFlow = conversationState.createProperty(CONVERSATION_FLOW_PROPERTY);
        this.conversationFlow2 = conversationState.createProperty(CONVERSATION_FLOW_PROPERTY2);

        this.welcomedUserProperty = userState.createProperty(WELCOMED_USER);
        this.userProfile = userState.createProperty(USER_PROFILE_PROPERTY);

        // The state management objects for the conversation and user state.
        this.conversationState = conversationState;
        this.userState = userState;

        // For LUIS
        this.luisRecognizer = new LuisRecognizer(luisApplication, luisPredictionOptions, true);

    }
    /**
     *
     * Use onTurn to handle an incoming activity, received from a user, process it, and reply as needed
     *
     * @param {TurnContext} on turn context object.
     */
    async onTurn(turnContext) {
    
        if (turnContext.activity.type === ActivityTypes.Message) {

            // Read the welcome property. Set to false if it doesn't exist (user just joined)
            const didBotWelcomedUser = await this.welcomedUserProperty.get(turnContext, false);

            // Intro Session
            if (didBotWelcomedUser === false) {
                // Get the state properties from the turn context.
                const flow = await this.conversationFlow.get(turnContext, { lastQuestionAsked: question.none });
                const profile = await this.userProfile.get(turnContext, {});

                await this.fillOutUserProfile(flow, profile, turnContext);

                // Save state changes
                await this.conversationFlow.set(turnContext, flow);
                await this.conversationState.saveChanges(turnContext);
                await this.conversationState.saveChanges(turnContext);


                await this.userProfile.set(turnContext, profile);
                await this.userState.saveChanges(turnContext);
            } 
            
            // First Session
            else {
                const flow = await this.conversationFlow2.get(turnContext, { lastQuestionAsked: question.none });
                const profile = await this.userProfile.get(turnContext, {});

                await this.fillOutUserProfile2(flow, profile, turnContext);

                // Save state changes
                await this.conversationFlow2.set(turnContext, flow);
                await this.conversationState.saveChanges(turnContext);

                await this.userProfile.set(turnContext, profile);
                await this.userState.saveChanges(turnContext);
            }
        } 

        // Send greeting when users are added to the conversation.
        else if (turnContext.activity.type === ActivityTypes.ConversationUpdate) {
            await this.sendWelcomeMessage(turnContext);
        } 
        
        // Generic message for all other activities
        else {
            await turnContext.sendActivity(`[${ turnContext.activity.type } event detected]`);
        }
    }


    /**
     * Sends welcome messages to conversation members when they join the conversation.
     * Messages are only sent to conversation members who aren't the bot.
     * @param {TurnContext} turnContext
     */
    async sendWelcomeMessage(turnContext) {
        
        // Do we have any new members added to the conversation?
        if (turnContext.activity.membersAdded.length !== 0) {

            // Iterate over all new members added to the conversation
            for (let idx in turnContext.activity.membersAdded) {

                if (turnContext.activity.membersAdded[idx].id !== turnContext.activity.recipient.id) {
                    await turnContext.sendActivity("Hello! My name is Arie, and I’m your personal chatbot. I am a private and anonymous resource for you to help manage your addiction.");
                }
            }
        }
    }

    /**
     * Send suggested actions to the user.
     * @param {TurnContext} turnContext A TurnContext instance containing all the data needed for processing this conversation turn.
     */
    async sendSuggestedActions(turnContext) {
        var reply = MessageFactory.suggestedActions(['Heroin', 'Meth', 'Cocaine', 'Marijuana', 'Opioids'], 'What substance are you struggling with?');
        await turnContext.sendActivity(reply);
    }

    async sendYesOrNo(turnContext, reply) {
        var reply = MessageFactory.suggestedActions(['Yes', 'No'], String(reply));
        await turnContext.sendActivity(reply);
    }

    async getIntent(turnContext) {
        // Perform a call to LUIS to retrieve results for the user's message.
        const results = await this.luisRecognizer.recognize(turnContext);

        // Since the LuisRecognizer was configured to include the raw results, get the `topScoringIntent` as specified by LUIS.
        const topIntent = results.luisResult.topScoringIntent;

        if (topIntent.intent == 'UserNo') {
            await turnContext.sendActivity("Believing one can use again without getting addicted to the substance is one of the most common warning signs of relapse. Nice job for resisting the urge! This wraps up today’s cognitive behavioral exercise.");
        }

        else if (topIntent.intent == 'UserYes') {
            await turnContext.sendActivity("This is a tough situation to be in. But you need to assert your choice to abstain, even if social forces increase the ease of its usage. In response to your friend, you can say “I do not want that, and since you’re my friend, I would appreciate it if you respected my decision.” This wraps up our cognitive behavioral exercise.");

        } 
        
        else {
            // If the top scoring intent was "None" tell the user no valid intents were found and provide help.
            await turnContext.sendActivity(`No LUIS intents were found.`);
        }
    }

    async getYesNoIntent(turnContext) {

            // Perform a call to LUIS to retrieve results for the user's message.
            const results = await this.luisRecognizer.recognize(turnContext);

            // Since the LuisRecognizer was configured to include the raw results, get the `topScoringIntent` as specified by LUIS.
            const topIntent = results.luisResult.topScoringIntent;

            if (topIntent.intent == 'UserNo') {
                return "No";
            }

            else if (topIntent.intent == 'UserYes') {
                return "Yes";
            } 

            else if (topIntent.intent == 'Benzodiazepines' || 
            topIntent.intent == 'Cannabinoids' || topIntent.intent == 'Depressants' 
                || topIntent.intent == 'Hallucinogens' || topIntent.intent == 'Opioids'
                || topIntent.intent == 'Stimulants' || topIntent.intent == 'inhalents') {
                return String(topIntent.intent);
            } 
            
            else {
                return "Error";
            }
    }

    async getSentiment(text) {

        return new Promise(resolve => {
        var data = {
            "documents": [
                {
                    "language": "en",
                    "id": "1",
                    "text": text
                }
            ]
        };

        var xhr = new XMLHttpRequest();
        xhr.withCredentials = true;

        xhr.addEventListener("readystatechange", function() {
            if (this.readyState === 4) {
                var json = JSON.parse(this.responseText);
                return resolve(json.documents[0].score);
            }
        });

        xhr.open("POST", "https://centralus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment");
        xhr.setRequestHeader("Ocp-Apim-Subscription-Key", "ade6bd1112104bf1ac9c5abf85c2d609");
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json");

        xhr.send(JSON.stringify(data));
    });
}

async messagePerson(profile) {

    var message = "Hi_" + profile.friend + ",_" + profile.name + "_is_having_a_bad_day,_and_it_would_be_great_if_you_could_talk_to_them._Please_talk_to_them_when_you_can!";
    var url = "https://unitingdust.api.stdlib.com/examples-twilio@dev/?tel=" + profile.number + "&body=" + message;

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;

    xhr.addEventListener("readystatechange", function() {
        if (this.readyState === 4) {
            return "cool";
        }
    });

    xhr.open("GET", url);
    xhr.send(null);
}


    // Manages the conversation flow for filling out the user's profile.
    async fillOutUserProfile(flow, profile, turnContext) {
        const input = turnContext.activity.text;

        switch (flow.lastQuestionAsked) {
            case question.none:
                await turnContext.sendActivity("I see that this is your first time. What is your name?");
                flow.lastQuestionAsked = question.name;
                break;

            case question.name:

                profile.name = input;
                await turnContext.sendActivity("Nice to meet you, " + profile.name);
                await turnContext.sendActivity("What substance are you struggling with?");

                flow.lastQuestionAsked = question.drug;
                break;

            
            case question.drug:

                var intent = String(await this.getYesNoIntent(turnContext));
                profile.drug = intent.toLowerCase();

                await turnContext.sendActivity("Thank you for sharing! " + profile.drug.charAt(0).toUpperCase() + profile.drug.slice(1) + " addiction is a complex brain disease that is in no means a testament to your self control. By taking the first steps to recognize and address your needs, you are on your way towards recovery.");
                await turnContext.sendActivity("Now tell me, what are your biggest concerns with using "  + profile.drug + "?");

                flow.lastQuestionAsked = question.concern;
                
                if (intent == "Error") {
                    await turnContext.sendActivity('Please enter a valid drug.');
                }

                break;

            case question.concern:
                profile.concern = input;
                await turnContext.sendActivity("I see. What is most difficult for you in abstaining from " + profile.drug + "?");

                flow.lastQuestionAsked = question.difficult;

                break;


            case question.difficult:
                profile.difficult = input;
                await turnContext.sendActivity("What goal would you like to set up for yourself?")

                flow.lastQuestionAsked = question.goal;

                break;

            case question.goal:
                profile.goal = input;

                await turnContext.sendActivity("What actions will you take to reach this goal?");
                flow.lastQuestionAsked = question.action;

                break;

            case question.action:
                profile.action = input;

                await turnContext.sendActivity("That’s great! Recovery can seem like a long process, so let’s take it one day at a time. I would like to work towards your goal. Check back with me tomorrow for our next session. See you later " + profile.name + "!");

                // Set the flag indicating the bot handled the user's first message.
                await this.welcomedUserProperty.set(turnContext, true);

                flow.lastQuestionAsked = question.none;
                profile = {};
                break;
        }
    }

    async fillOutUserProfile2(flow, profile, turnContext) {
        const input = turnContext.activity.text;

        switch (flow.lastQuestionAsked) {
            case question2.none:
                await turnContext.sendActivity("Hello "  + profile.name + "! Glad to hear from you today. How are you feeling?");

                flow.lastQuestionAsked = question2.feeling;
                break;

            case question2.feeling:

                var score = await this.getSentiment(input);

                if (score >= 0 && score <= 0.01) {
                    await turnContext.sendActivity("I’m really sorry to hear that! Let's get you connected with someone that you can talk to");
                    await turnContext.sendActivity("Enter the phone number of the person you want to talk to");

                    flow.lastQuestionAsked = question2.phone;

                    return;
                }

                else if (score > 0.01 && score <= 0.49) {
                    await turnContext.sendActivity(" I see. Sometimes, our bad days make our good days feel even better!");
                }

                else if (score > 0.49 && score <= 0.85) {
                    await turnContext.sendActivity("I see. Thanks for sharing!");
                }

                else {
                    await turnContext.sendActivity("Good to hear that you are doing well!");
                }


                await turnContext.sendActivity("I will provide a recap from our last session. When I asked you what your biggest concerns were with using " + profile.drug + ", you said, " + '"' + profile.concern + '". Is that correct?');
                flow.lastQuestionAsked = question2.recap;

                break;

            case question2.phone:
                profile.number = input;

                await turnContext.sendActivity("What is their name?");
                flow.lastQuestionAsked = question2.call;

                break;

            case question2.call:
                profile.friend = input;
                await this.messagePerson(profile);
                await turnContext.sendActivity("I contacted the person for you. Please take it easy for the rest of the day.");

                flow.lastQuestionAsked = question.none;
                profile = {};
                break;

            case question2.recap:

                var intent = String(await this.getYesNoIntent(turnContext));

                if (intent == "Yes") {
                    await turnContext.sendActivity("Also, when I asked you what your goal was for last session, you said " + '"' + profile.goal +  '"' + ". To achieve this goal, you said " + '"' + profile.action + '". Did you achieve your goal?');

                    flow.lastQuestionAsked = question2.recap2;
                }

                else if (intent == "No") {
                    await turnContext.sendActivity("What is your new concern? I will update it for you.")
                    flow.lastQuestionAsked = question2.concernCorrection;
                }

                else {
                    await turnContext.sendActivity("Sorry I didn't get that. Please retype your answer");
                }

                break;

            case question2.recap2:

                var intent = String(await this.getYesNoIntent(turnContext));

                if (intent == "Yes") {
                    await turnContext.sendActivity("Great!");
                    await turnContext.sendActivity("Alright, now we will move on to some cognitive behavioral exercises that will help you handle situations that may trigger your addiction.");

                    flow.lastQuestionAsked = question2.scenario;
                }

                else if (intent == "No") {
                    await turnContext.sendActivity("Oh no! Could you explain why?");

                    flow.lastQuestionAsked = question2.explain;
                }

                else {
                    await turnContext.sendActivity("Sorry I didn't get that. Please retype your answer");
                }

                break;

            case question2.concernCorrection:
                profile.concern = input;

                await turnContext.sendActivity("I have updated your concern for you " + profile.name);
                await turnContext.sendActivity("Also, when I asked you what your goal was for last session, you said " + '"' + profile.goal +  '"' + ". To achieve this goal, you said " + '"' + profile.action + '". Did you achieve your goal?');

                flow.lastQuestionAsked = question2.recap2;
                break;

            case question2.explain:

                await turnContext.sendActivity("What can you do differently to achieve this goal in the future?");

                flow.lastQuestionAsked = question2.different;
                break;

            case question2.different:
                await turnContext.sendActivity("Good to hear! Now we will move on to some cognitive behavioral exercises that will help you handle situations that may trigger your addiction.");

                flow.lastQuestionAsked = question2.scenario;
                break;

            case question2.scenario:

                await turnContext.sendActivity("Imagine you are out on a Friday night hanging out with a friend. You go back to one of your friend’s apartment, and they offer you " + profile.drug + ". What will you tell your friend?");
                flow.lastQuestionAsked = question2.scenario2;

                break;

            case question2.scenario2:

                var intent = String(await this.getYesNoIntent(turnContext));

                if (intent == "Yes") {
                    await turnContext.sendActivity("When I asked you what is most difficult for you in abstaining from your substance, you said " + '"' + profile.difficult + '"' + ". For many, recovery is hard, and it is normal for there to be relapses in the path towards recovery. However, I want you to start building healthy coping habits, not using substances to do so. If your friend tells you “Using one time isn’t going to get you addicted,” and offers the substance to you, what will you say?");

                    flow.lastQuestionAsked = question2.result;
                }

                else if (intent == "No") {
                    await turnContext.sendActivity("Your friend tells you that you’re being silly. “Using one time isn’t going to get you addicted,” they say. They offer it to you again. What do you say?");

                    flow.lastQuestionAsked = question2.result;
                }

                else {
                    await turnContext.sendActivity("Sorry I didn't get that. Please retype your answer");
                }

                break;

            case question2.result:
                await this.getIntent(turnContext);

                flow.lastQuestionAsked = question2.final;
                break;

            case question2.final:
                await turnContext.sendActivity("Your daily assignment for today is to write five “I” statement goals regarding your goals for recovery. Make them specific, achievable, and measurable. These can be related to your lifestyle, career, relationships, health, or finances. Next time, we will talk about them! See you later " + profile.name + "!");

                flow.lastQuestionAsked = question.none;
                profile = {};
                break;

        }
    }
}

exports.EchoBot = EchoBot;
