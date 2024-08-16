const { pool } = require('../../config/db.js');
const { qnaDocQuery } = require('./userController.js');
// const {handleNewMessageService} = require('../services/webhookService.js');

const handleNewMessage = async(req,res)=>{
    console.log('webhook works!');
    console.log(req);

    try {
        const {whatsapp,contact,contactId} = req.body;
        const {from,time,type,text,image} = whatsapp;
        const {name} = contact;

        console.log(from,time,type,text,image,name,contactId);
        if (text.body.startsWith('/qna')) {
            console.log('qna command');
            await qnaDocQuery(req,res);
        } else if (text.startsWith('/log')) {
            logWorkout({ phone, contactId, name, messageType, text: text.replace('/log', '').trim() });
        } else if (text.startsWith('/report')) {
            generateReport({ phone, contactId, name, messageType, text: text.replace('/report', '').trim() });
        } else {
            userQuery({ phone, contactId, name, messageType, text });
        }


        // if (!data || !data.whatsapp) {
        //     return res.status(400).send('Invalid webhook payload');
        // }
        // const { from: phone, type, image, message } = data.whatsapp;
        // const { id: contactId, name } = data.contact || {};
        console.log('IDHAR AGYE');
        res.status(200).send({"message":"webhook call success"});

    } catch (error) {
        console.log(error)
        res.status(500).send({
           success:false,
           message:'Error in webhook',
           error ,
        });
        
    }
}


module.exports= {handleNewMessage};