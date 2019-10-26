const functions = require('firebase-functions');
const admin = require('firebase-admin');
//admin.initializeApp();
admin.initializeApp({
   // credential: admin.credential.cert(require('../service-account-key.json'))
});

exports.notifyParticipants = functions.firestore
    .document('chatrooms/{chatroomId}')
    .onWrite(async (change, context) => {
        // Get an object with the current document value.
        // If the document does not exist, it has been deleted.
         const document = change.after.exists ? change.after.data() : null;
        // console.log("document is: " + JSON.stringify(document))
        // Get an object with the previous document value (for update or delete)
         const oldDocument = change.before.data();
        // console.log("old document is: " + JSON.stringify(oldDocument));

   
        if (!document.messages) { return; }
        const messagesChanged = document.messages != oldDocument.messages;
        //console.log("messagesChanged?:" + messagesChanged);
        if (messagesChanged) {
            console.log("messages changed");

            //TODO: add tokens to array then send
            const payload = {
                notification: {
                    title: 'A new message was sent',
                    body: `Message body`//,
                    //icon: follower.photoURL
                }
            };
            console.log("participants:", JSON.stringify(document.participants));
            /*
            const userRefs = new Array();
            for (const userID of document.participants) {
               // splitUserId=userID.split("/")[1];
               // console.log("aduserref:" + splitUserId);
                
                const ref = admin.firestore().collection(userID);//.doc(splitUserId);
                userRefs.push(ref);
            }
            */
            const tokens = new Array();
            await admin.firestore().getAll(...document.participants).then(snapshots => {
                snapshots.forEach(async snapshot => {
                    // snapshot.data
                    console.log('data:' + JSON.stringify(snapshot.data()));
                    console.log('fcmToken: ', snapshot.data().fcmToken);
                    const fcmToken = snapshot.data().fcmToken;
                    tokens.push(fcmToken);

                })
            }).catch(err => console.log('error:' + err));

            console.log("sending notifications...")
            const notifyResponse = await admin.messaging().sendToDevice(tokens, payload);
            console.log("notifications sent!")
            notifyResponse.results.forEach((result, index) => {
                console.log("notification result:", result)
                const error = result.error;
                if (error) {
                    console.error('Failure sending notification to', error);
                    /*
                  console.error('Failure sending notification to', tokens[index], error);
                  // Cleanup the tokens who are not registered anymore.
                  if (error.code === 'messaging/invalid-registration-token' ||
                      error.code === 'messaging/registration-token-not-registered') {
                    tokensToRemove.push(tokensSnapshot.ref.child(tokens[index]).remove());
                  }
                  */
                }
            });
        }
        else { console.log("messages didn't change"); }

    });
