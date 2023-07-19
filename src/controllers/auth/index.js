import { ValidationError } from "yup"
// import handlebars from "handlebars"
// import fs from "fs"
// import path from "path"
// import moment from "moment"

import * as config from "../../config/index.js"
import * as helpers from "../../helpers/index.js"
import * as error from "../../middlewares/error.handler.js"
import { User } from "../../models/all.models.js";
import db from "../../models/index.js"
import * as validation from "./validation.js"

// @register process
export const register = async (req, res, next) => {
    try {
        // @validation
        const { username, password, email, phone } = req.body;
        await validation.RegisterValidationSchema.validate(req.body);

        // @check if user already exists
        const userExists = await User?.findOne({ where: { username, email } });
        if (userExists) throw ({ status : 400, message : error.USER_ALREADY_EXISTS });

        // @create user -> encypt password
        const hashedPassword = helpers.hashPassword(password);
        
        
        // @archive user data
        const user = await User?.create({
            username,
            password : hashedPassword,
            email,
            phone
        });


        // @delete unused data from response
        delete user?.dataValues?.password;

        // @generate access token
        const accessToken = helpers.createToken({ id: user?.dataValues?.id, username : user?.dataValues?.username });
        
        // @send response
        res.header("Authorization", `Bearer ${accessToken}`)
            .status(200)
            .json({
                message: "User created successfully",
                user
            });

        // @generate email message
        // const template = fs.readFileSync(path.join(process.cwd(), "templates", "index.html"), "utf8");
        // const message  = handlebars.compile(template)({ otpToken, link : config.REDIRECT_URL + `/auth/verify/reg-${user?.dataValues?.uuid}` })

        //@send verification email
        const mailOptions = {
            from: config.GMAIL,
            to: email,
            subject: "Verification",
            html: `<h1> Click <a href="http://localhost:5000/api/auth/users/verify/${accessToken}">here</a> to verify your account</h1>`
        }
        helpers.transporter.sendMail(mailOptions, (error, info) => {
            if (error) throw error;
            console.log("Email sent: " + info.response);
        })






    } catch (error) {
        // @check if error from validation
        if (error instanceof ValidationError) {
            return next({ status : 400, message : error?.errors?.[0] })
        }
        next(error)
    }
}

// @login process
export const login = async (req, res, next) => {
    try {
        // validation, we assume that username will hold either username or email
        const { username, password } = req.body;
        await validation.LoginValidationSchema.validate(req.body);

        // @check if username is email
        const isAnEmail = await validation.IsEmail(username);
        const query = isAnEmail ? { email : username } : { username };
        
        // @check if user exists
        const userExists = await User?.findOne({ where : query });
        if (!userExists) throw ({ status : 400, message : error.USER_DOES_NOT_EXISTS });

         // @check if password is correct
         const isPasswordCorrect = helpers.comparePassword(password, userExists?.dataValues?.password);
         if (!isPasswordCorrect) throw ({ status : 400, message : error.INVALID_CREDENTIALS });

         // @delete password from response
        delete userExists?.dataValues?.password;

        // @generate access token
        const accessToken = helpers.createToken({ id: userExists?.dataValues?.id, username : userExists?.dataValues?.username });

        // @send response
        res.header("Authorization", `Bearer ${accessToken}`)
            .status(200)
            .json({
                user : userExists
            });

    } catch (error) {
        res.status(500).json({
            message: "Something went wrong",
            error: error?.message || error
        });
    }
}


// @verify account
export const verify = async (req, res, next) => {
    try {
        // @get token from body
        const { token } = req.params;    
        //nanti ganti jadi body
        
        // @verify token 
        const decodedToken = helpers.verifyToken(token);


        // @check if user exists
        const userExists = await User?.findOne({ where : { id : decodedToken.id } });
        if (!userExists) throw ({ status : error.NOT_FOUND_STATUS, message : error.USER_DOES_NOT_EXISTS });

        // @verify token
        // if (token !== user?.dataValues?.otp) throw ({ status : 400, message : error.INVALID_CREDENTIALS });

        // @check if token is expired
        // const isExpired = moment().isAfter(user?.dataValues?.expiredOtp);
        // if (isExpired) throw ({ status : 400, message : error.INVALID_CREDENTIALS });

        // @check context to do query action
        // if (context === "reg") {
        
        // @update user status
        await User?.update({ isVerified : 1, verifyToken : null, expiredToken : null }, { where : { id : decodedToken.id } });


        // @return response
        res.status(200).json({ message : "Account verified successfully" })

        // await transaction.commit();
    } catch (error) {
        // await transaction.rollback();
        next(error)
    }
}

// @delete account
export const deleteAccount = async (req, res, next) => {
    try {
        // @get user id from token
        const { id } = req.user;

        // @delete user
        await User?.destroy({ where : { id } });

        // @return response
        res.status(200).json({ message : "Account deleted successfully" })
    } catch (error) {
        next(error)
    }
}