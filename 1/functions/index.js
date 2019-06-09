const functions = require('firebase-functions');
const { dialogflow,MediaObject,SimpleResponse,Suggestions } = require('actions-on-google');
const app = dialogflow({ debug: true });
const admin = require("firebase-admin");
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();
const moment = require("moment-timezone");
const uuid = require('uuid/v4');


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

async function set_user(uuid,team){
    let team_json = {"team": team}
    var setDoc = db.collection('users').doc(uuid).set(team_json);
}

async function fetch_user_data(uuid){
    let users_ref = await db.collection("users")
    let user = await users_ref.doc(uuid).get()
    let user_data = await user.data()
    return user_data
}

async function first_response(conv){
    conv.contexts.set("ask_team", 1, {});
    conv.ask(new SimpleResponse({
        speech: "好きな野球チームを教えてください。",
        text: "好きな野球チームを教えてください。"
    }));
}

app.intent("Default Welcome Intent",async conv => {
    console.log("user_raw_input:", conv.query)
    console.log("show userStorage",conv.user.storage)
    let uuid = conv.user.storage.user_id
    if(uuid === undefined){
        first_response(conv)
    }else{
        let user_data = await fetch_user_data(uuid)
        console.log(user_data)
        if(user_data === undefined){
            first_response(conv)
        }else {
            let response_str = `${user_data.team}は、2対１で勝ちました。`
            conv.close(new SimpleResponse({
                speech: response_str,
                text: response_str
            }));
        }
    }

})

app.intent("ask_team__succeed",async conv => {
    console.log("user_raw_input:", conv.query)
    let query = conv.query
    let team = conv.parameters.teams
    console.log("show userStorage",conv.user.storage)
    conv.user.storage.team = team
    conv.contexts.set("ask_team", 1, {});
    conv.ask(new SimpleResponse({
        speech: `あなたの好きなチームは、${team}であっていますか？。`,
        text: `あなたの好きなチームは、${team}であっていますか？。`
    }));
})

app.intent("confirm_team__succeed",async conv => {
    console.log("user_raw_input:", conv.query)
    console.log("show userStrage",conv.user.storage)
    let team = conv.user.storage.team
    let uuid_generated = uuid()
    conv.user.storage.user_id = uuid_generated
    await set_user(uuid_generated,team)
    conv.close(new SimpleResponse({
        speech: "登録完了です！次回起動時から、そのチームの結果を返答します。",
        text: "登録完了です！次回起動時から、そのチームの結果を返答します。"
    }));
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
