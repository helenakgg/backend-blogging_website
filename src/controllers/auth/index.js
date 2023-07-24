import { ValidationError } from "yup"
import handlebars from "handlebars"
import fs from "fs"
import path from "path"
import moment from "moment"
import cloudinary from "cloudinary"

import * as config from "../../config/index.js"
import * as helpers from "../../helpers/index.js"
import * as error from "../../middlewares/error.handler.js"
import { User } from "../../models/user.js"
import db from "../../database/index.js"
import * as validation from "./validation.js"

const cache = new Map()

// @register process
export const register = async (req, res, next) => {
    // @create transaction
    const transaction = await db.sequelize.transaction();
    try {

        // @validation
        const { username, password, email, phone } = req.body;
        await validation.RegisterValidationSchema.validate(req.body);

        // @check if user already exists
        const userExists = await User?.findOne({ where: { username, email } });
        if (userExists) throw ({ status : 400, message : error.USER_ALREADY_EXISTS });

        // @create user -> encypt password
        const hashedPassword = helpers.hashPassword(password);
        
        // @generate otp token
        const otpToken = helpers.generateOtp();
        
        // @archive user data
        const user = await User?.create({
            username,
            password : hashedPassword,
            email,
            phone,
            otp : otpToken,
            expiredOtp : moment().add(1, "days").format("YYYY-MM-DD HH:mm:ss")
        });

        // @delete unused data from response
        delete user?.dataValues?.password;
        delete user?.dataValues?.otp;
        delete user?.dataValues?.expiredOtp;

        // @generate access token
        const accessToken = helpers.createToken({ uuid: user?.dataValues?.uuid, username : user?.dataValues?.username });
        
        // @send response
        res.header("Authorization", `Bearer ${accessToken}`)
            .status(200)
            .json({
                message: "User created successfully",
                user
            });

        // @generate email message
        const template = fs.readFileSync(path.join(process.cwd(), "templates", "otp.html"), "utf8");
        const message  = handlebars.compile(template)({ otpToken, link : config.REDIRECT_URL + `/auth/verify/reg-${user?.dataValues?.uuid}` })

        //@send verification email
        const mailOptions = {
            from: config.GMAIL,
            to: email,
            subject: "Verification",
            html: message
        }
        
        helpers.transporter.sendMail(mailOptions, (error, info) => {
            if (error) throw error;
            console.log("Email sent: " + info.response);
        })

        // @commit transaction
        await transaction.commit();
    } catch (error) {
        // @rollback transaction
        await transaction.rollback();

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

         // @check token in chache
        const cachedToken = cache.get(userExists?.dataValues?.uuid)
        const isValid = cachedToken && helpers.verifyToken(cachedToken)
        let accessToken = null
        if (cachedToken && isValid) {
            accessToken = cachedToken
        } else {
            // @generate access token
            const accessToken = helpers.createToken({ uuid: userExists?.dataValues?.uuid, username : userExists?.dataValues?.username });
        }
            
         // @delete password from response
        delete userExists?.dataValues?.password;
        delete userExists?.dataValues?.otp;
        delete userExists?.dataValues?.expiredOtp;
         
        // @send response
        res.header("Authorization", `Bearer ${accessToken}`)
            .status(200)
            .json({ user : userExists });

    } catch (error) {
        // @check if error from validation
        if (error instanceof ValidationError) {
            return next({ status : 400, message : error?.errors?.[0] })
        }
        next(error)
    }
}

// @keeplogin
export const keepLogin = async (req, res, next) => {
    try {
        // @get user id from token
        const { uuid } = req.user;
        
        // @get user data
        const user = await User?.findOne({ where : { uuid } });

        // @delete password from response
        delete user?.dataValues?.password;
        delete user?.dataValues?.otp;
        delete user?.dataValues?.expiredOtp;

        // @return response
        res.status(200).json({ user })
    } catch (error) {
        next(error)
    }
}

// @verify account
export const verify = async (req, res, next) => {
    // const transaction = await db.sequelize.transaction();
    try {
        // @get token from body
        const { uuid, token } = req.body;

        // @check context
        const context = uuid.split("-")[0];
        const userId = uuid.split("-")?.slice(1)?.join("-");

        // @check if user exists
        const user = await User?.findOne({ where : { uuid : userId } });
        if (!user) throw ({ status : error.NOT_FOUND_STATUS, message : error.USER_DOES_NOT_EXISTS });

        // @verify token
        if (token !== user?.dataValues?.otp) throw ({ status : 400, message : error.INVALID_CREDENTIALS });

        // @check if token is expired
        const isExpired = moment().isAfter(user?.dataValues?.expiredOtp);
        if (isExpired) throw ({ status : 400, message : error.INVALID_CREDENTIALS });

        // @check context to do query action
        if (context === "reg") {
            // @update user status
            await User?.update({ isVerified : 1, otp : null, expiredOtp : null }, { where : { uuid : userId } });
        }
        
        // @return response
        res.status(200).json({ message : "Account verified successfully", data : uuid })

        // await transaction.commit();
    } catch (error) {
        // await transaction.rollback();
        next(error)
    }
}

// @request otp token
export const requestOtp = async (req, res, next) => {
    try {
        // @get user email, context from body (reg or reset)
        const { email, context } = req.body;

        // @check if user exists
        const user = await User?.findOne({ where : { email } });
        if (!user) throw ({ status : 400, message : error.USER_DOES_NOT_EXISTS });

        // @generate otp token
        const otpToken = helpers.generateOtp();

        // @update user otp token
        await User?.update({ otp : otpToken, expiredOtp : moment().add(1, "days").format("YYYY-MM-DD HH:mm:ss") }, { where : { email } });

        // @generate email message
        const template = fs.readFileSync(path.join(process.cwd(), "templates", "otp.html"), "utf8");
        const message  = handlebars.compile(template)({ otpToken, link : config.REDIRECT_URL + `/auth/verify/${context}-${user?.dataValues?.uuid}` })

        //@send verification email
        const mailOptions = {
            from: config.GMAIL,
            to: email,
            subject: "Verification",
            html: message
        }
        helpers.transporter.sendMail(mailOptions, (error, info) => {
            if (error) throw error;
            console.log("Email sent: " + info.response);
        })

        // @return response
        res.status(200).json({ message : "Otp token requested successfully" })
    } catch (error) {
        next(error)
    }
}

// @forgot password
export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;     
        await validation.EmailValidationSchema.validate(req.body);

        const isUserExist = await User?.findOne({ where : { email } });

        if (!isUserExist) throw ({ 
            status : error.BAD_REQUEST_STATUS, 
            message : error.USER_DOES_NOT_EXISTS 
        })

        const otpToken = helpers.generateOtp();
        await User?.update({otp : otpToken, expiredOtp : moment().add(1,"days").format("YYYY-MM-DD HH:mm:ss")},{where : {email : email}})

        const template = fs.readFileSync(path.join(process.cwd(), "templates", "otp.html"), "utf8");

        const message = handlebars.compile(template)({otpToken, link : config.REDIRECT_URL+`/auth/reset/fp-${isUserExist?.dataValues?.uuid}`})

        const mailOptions = {
            from: config.GMAIL,
            to: email,
            subject: "Forgot Password",
            html: message
        }

        helpers.transporter.sendMail(mailOptions, (error, info) => {
            if (error) throw error;
            console.log("Email sent: " + info.response);
        })

        res.status(200).json({ 
            message : "Check your Email to reset your password",
        })
    } catch (error) {
        if (error instanceof ValidationError) {
            return next({ 
                status : error.BAD_REQUEST_STATUS , 
                message : error?.errors?.[0] 
            })
        }
        next(error)
    }
}

// @reset password
export const resetPassword = async (req, res, next) => {
    // const transaction = await db.sequelize.transaction();
    try {
        const { uuid, token, newPassword } = req.body;
        // await validation.resetPasswordSchema.validate(req.body);

        const context = uuid.split("-")[0];
        const userId = uuid.split("-")?.slice(1)?.join("-");

        const user = await User?.findOne({where : {uuid : userId} });
        if (!user) throw ({ 
            status : error.BAD_REQUEST_STATUS, 
            message : error.USER_DOES_NOT_EXISTS 
        })
        if(token !== user?.dataValues?.otp) throw ({status : 400, message : error.INVALID_CREDENTIALS});

        const isExpired = moment().isAfter(user?.dataValues?.expiredOtp);
        if(isExpired) throw ({status : 400, message : error.INVALID_CREDENTIALS});


        const hashedPassword = helpers.hashPassword(newPassword);
        if(context === "fp"){
        await User?.update(
            { 
                password: hashedPassword,
                otp : null,
                expiredOtp : null 
            }, 
            { where: { uuid : userId } }
        )};

        // @delete password from response
        delete user?.dataValues?.password;
        delete user?.dataValues?.otp;
        delete user?.dataValues?.expiredOtp;

        res.status(200).json({ 
            message : "Reset password success",
            user
        })

        // await transaction.commit();
    } catch (error) {
        // await transaction.rollback();

        if (error instanceof ValidationError) {
            return next({ 
                status : error.BAD_REQUEST_STATUS , 
                message : error?.errors?.[0] 
            })
        }
        next(error)
    }
}

export const changeUsername = async (req, res, next) => {
    try{
        const {currentUsername, newUsername} = req.body;
        await validation.changeUsernameSchema.validate(req.body);
        await User.update({username : newUsername},{where : {username : currentUsername}})
        res.status(200).json({message : "Change username success"})
    }catch(error){
        next(error)
    }
}

export const changePassword = async (req, res, next) => {
    // const transaction = await db.sequelize.transaction();
    try {
        const { currentPassword, newPassword } = req.body;

        await validation.changePasswordSchema.validate(req.body);

        const hashedOldPassword = helpers.hashPassword(currentPassword);
        const hashedNewPassword = helpers.hashPassword(newPassword);
        await User.update({password : hashedNewPassword},{where : {password : hashedOldPassword}})

        res.status(200).json({ 
            message : "Changed password success"
        })

        // await transaction.commit();
    } catch (error) {
        // await transaction.rollback();

        if (error instanceof ValidationError) {
            return next({ 
                status : error.BAD_REQUEST_STATUS , 
                message : error?.errors?.[0] 
            })
        }

        next(error)
    }
}

export const changeEmail = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {currentEmail, newEmail} = req.body;
        await validation.changeEmailSchema.validate(req.body);
        await User.update({email : newEmail},{where : {email : currentEmail}})

        res.status(200).json({ 
            message : "Changed email success.", 
        })
    } catch (error) {
       
        if (error instanceof ValidationError) {
            return next({
                status : error.BAD_REQUEST_STATUS, 
                message : error?.errors?.[0]
            })
        }
        next(error)
    }
}

export const changePhone = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const {currentPhone, newPhone} = req.body;
        await validation.changePhoneSchema.validate(req.body);
        await User.update({phone : newPhone},{where : {phone : currentPhone}})

        res.status(200).json({ 
            message : "Change phone number success"
        })
    } catch (error) {
        if (error instanceof ValidationError) {
            return next({
                status : error.BAD_REQUEST_STATUS, 
                message : error?.errors?.[0]
            })
        }
        next(error)
    }
}

export const changeProfile = async (req, res, next) => {
        try {
        const uuid = req.body.id;

        if(!req.file){
            throw new({status : 400, message : "Please upload an image."})
        }
        const imageURL = "public/images/profiles/"+req?.file?.filename
        await User?.update({imgProfile : imageURL},{where : {userId : uuid}})
        res.status(200).json(
            { 
                message : "Image uploaded successfully", 
                imageUrl : req.file?.filename 
            }
        )
    } catch (error) {
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

export const getProfilePicture = async (req, res, next) => {
    try {
    const { folder, file } = req.params;
    const image = path.join(process.cwd(), "public", "images", folder, file);
    //@send response
    res.status(200).sendFile(image);
  } catch (error) {
    next(error);
  }
};