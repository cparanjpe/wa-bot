const pool = require("../../config/db");

const updateProfileService = async (payload) => {
    const {name,phone,email,age,goal,diet} = payload;
    console.log(name,phone,email,age,goal,diet);
    try {
        const query = `
        INSERT INTO users (name, phone, email, age, goal, diet)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          phone = VALUES(phone),
          age = VALUES(age),
          goal = VALUES(goal),
          diet = VALUES(diet);
        `;
  
        // Execute the query
        await pool.query(query, [name, phone, email, age, goal, diet]);
        return {"message":"Profile updated !"};
        
    } catch (error) {
        console.error("Error in signUpUserService:", error);
        throw error;
    }
};

const logWorkoutService = async (payload) => {
   const { phone,description} = payload;
   const phone1 = phone[0];
   const payld = {phone:phone1,description:description};
   console.log(JSON.stringify(payld));
    try {
        const [[result]] = await pool.query(`CALL handleMomentum(?)`,[JSON.stringify(payld)]);
        console.log(result);
    
        return {"message": `Workout logged !\nYour Momentum Score : ${result[0].momentum} 🚀🚀\nStreak: ${result[0].streak} ⚡`};
        
    } catch (error) {
        console.error("Error in signUpUserService:", error);
        throw error;
    }
};

const generateReportService = async(payload)=>{
    const { phone} = payload;
    console.log('agye')
    try {
        const query = `
    SELECT u.*,COALESCE(
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'description', w.description,
            'workout_date', w.workout_date
          )
        ), 
        JSON_ARRAY()
      ) AS workouts
    FROM users u
    LEFT JOIN workout w ON w.phone = u.phone
    WHERE u.phone = ? 
    GROUP BY u.id;
  `;
    const result=  await pool.query(query, [phone]);
    console.log(result);
    return result;
        
    } catch (error) {
        console.error("Error in signUpUserService:", error);
        throw error;
    }
    
}

const userQueryService = async(payload)=>{
  const { phone} = payload;
  try {
      const query = `
      SELECT 
      u.*, 
        IFNULL(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'description', w.description,
              'workout_date', w.workout_date
            )
          ), 
          JSON_ARRAY()  -- Return an empty JSON array if no workouts are found
        ) AS workouts
      FROM users u 
      LEFT JOIN workout w ON w.phone = u.phone
      AND w.workout_date >= CURDATE() - INTERVAL 7 DAY
      WHERE u.phone = ?
      GROUP BY u.id;
          `;
  const result=  await pool.query(query, [phone]);
  console.log(result);
  return result;
      
  } catch (error) {
      console.error("Error in userQueryService:", error);
      throw error;
  }
  
}

const qnaDocQueryService = async(payload)=>{
  const { phone} = payload;
  try {
      const query = `
      SELECT 
      u.*, 
        IFNULL(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'description', w.description,
              'workout_date', w.workout_date
            )
          ), 
          JSON_ARRAY()  -- Return an empty JSON array if no workouts are found
        ) AS workouts
      FROM users u 
      LEFT JOIN workout w ON w.phone = u.phone
      AND w.workout_date >= CURDATE() - INTERVAL 7 DAY
      WHERE u.phone = ?
      GROUP BY u.id;
          `;
  const result=  await pool.query(query, [phone]);
  console.log(result);
  return result;
      
  } catch (error) {
      console.error("Error in userQueryService:", error);
      throw error;
  }
  
}



module.exports = { updateProfileService,logWorkoutService,generateReportService,userQueryService,qnaDocQueryService};
