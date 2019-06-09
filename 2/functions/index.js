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

async function set_user(uuid,team,name){
    let team_json = {
        "team": team,
        "name": name
    }
    var setDoc = db.collection('users').doc(uuid).set(team_json);
}

async function fetch_user_data(uuid){
    let users_ref = await db.collection("users")
    let user = await users_ref.doc(uuid).get()
    let user_data = await user.data()
    return user_data
}

async function fetch_user_by_name(name){
    let users_ref = await db.collection("users")
    let user = await users_ref.where('name', '==', name).get()
    let user_data = await user.docs
    return user_data
}

async function first_response(conv){
    conv.contexts.set("ask_team", 1, {});
    conv.ask(new SimpleResponse({
        speech: "好きな野球チームを教えてください。",
        text: "好きな野球チームを教えてください。"
    }));
}

async function name_question(conv){
    conv.contexts.set("ask_name", 1, {});
    conv.ask(new SimpleResponse({
        speech: "わかりました！では、あなたの好きなチームを覚えておくので、あなたのお名前を教えてください。",
        text: "わかりました！では、あなたの好きなチームを覚えておくので、あなたのお名前を教えてください。"
    }));
}

app.intent("Default Welcome Intent",async conv => {
    console.log("user_raw_input:", conv.query)
    console.log("show userStorage",conv.user.storage)
    let uuid = conv.user.storage.user_id
    if(uuid === undefined){
        first_response(conv)
    }else{

        conv.contexts.set("ask_registrated_name", 1, {});
        conv.ask(new SimpleResponse({
            speech: `野球の結果をお伝えします。あなたのお名前を教えてください。`,
            text: `野球の結果をお伝えします。あなたのお名前を教えてください。`
        }));

    }

})

app.intent("ask_registrated_name",async conv => {
    console.log("user_raw_input:", conv.query)
    console.log("show userStorage",conv.user.storage)
    console.log("name:", conv.parameters.any)
    let name = conv.parameters.any
    let user = await fetch_user_by_name(name)
    if(user.length == 0){
        conv.contexts.set("ask_registrated_name", 1, {});
        conv.ask(new SimpleResponse({
            speech: `ユーザーの検索に失敗しました。もう一度あなたのお名前を教えてください。ユーザーを新規に登録する場合は、「登録」と言ってください`,
            text: `ユーザーの検索に失敗しました。もう一度あなたのお名前を教えてください。ユーザーを新規に登録する場合は、「登録」と言ってください`
        }));
    }else{
        let hit_user = user[0].data()
        let favorite_team = hit_user.team

        let response_str = `${favorite_team}は、2対１で勝ちました。`
        conv.close(new SimpleResponse({
            speech: response_str,
            text: response_str
        }));

    }

})

app.intent("ask_team",async conv => {
    console.log("user_raw_input:", conv.query)
    let query = conv.query
    let team = conv.parameters.teams
    console.log("show userStorage",conv.user.storage)
    conv.user.storage.team = team
    conv.contexts.set("confirm_team", 1, {});
    conv.ask(new SimpleResponse({
        speech: `あなたの好きなチームは、${team}であっていますか？。`,
        text: `あなたの好きなチームは、${team}であっていますか？。`
    }));
})

app.intent("confirm_team__succeed",async conv => {
    console.log("user_raw_input:", conv.query)
    console.log("show userStrage",conv.user.storage)
    let team = conv.user.storage.team

    // ↓後にする？
    // let uuid_generated = uuid()
    // conv.user.storage.user_id = uuid_generated
    // await set_user(uuid_generated,team)

    conv.contexts.set("ask_name", 1, {});
    await name_question(conv)
})

app.intent("ask_name",async conv => {
    console.log("user_raw_input:", conv.query)
    console.log("show userStorage",conv.user.storage)
    let query = conv.query
    let name = conv.parameters.any
    console.log("show name",name)
    conv.user.storage.name = name
    conv.contexts.set("confirm_name", 1, {});
    conv.ask(new SimpleResponse({
        speech: `あなたのお名前は、${name}さんであっていますか？。`,
        text: `あなたのお名前は、${name}さんであっていますか？。`
    }));
})

app.intent("confirm_name__succeed",async conv => {
    console.log("user_raw_input:", conv.query)
    console.log("show userStrage",conv.user.storage)
    let team = conv.user.storage.team
    let name = conv.user.storage.name

    let uuid_generated = uuid()
    conv.user.storage.user_id = uuid_generated
    await set_user(uuid_generated,team,name)

    conv.contexts.set("ask_name", 1, {});
    conv.close(new SimpleResponse({
        speech: "登録完了です！次回起動時から、あなたのお好きなチームの結果を返答します。",
        text: "登録完了です！次回起動時から、あなたのお好きなチームの結果を返答します。"
    }));
})

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
