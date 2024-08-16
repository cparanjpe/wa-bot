const pool = require("../../config/db");

const handleNewMessageService = async (payload) => {
    const {name,phone,email,age,goal,diet} = payload;
    console.log(name,phone,email,age,goal,diet);
    try {
   
        
    } catch (error) {
        console.error("Error in signUpUserService:", error);
        throw error;
    }
};
 module.exports={handleNewMessageService}