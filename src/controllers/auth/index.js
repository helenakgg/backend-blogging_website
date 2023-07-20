import { ValidationError } from "yup"
import handlebars from "handlebars"
import fs from "fs"
import path from "path"
import moment from "moment"
import cloudinary from "cloudinary"

import * as config from "../../config/index.js"
import * as helpers from "../../helpers/index.js"
import * as error from "../../middlewares/error.handler.js"
import { User } from "../../models/all.models.js"
import db from "../../models/index.js"
import * as validation from "./validation.js"

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

        await User?.update({ 
                verify_token : accessToken,
                expired_token : moment().add(1, "days").format("YYYY-MM-DD HH:mm:ss")
            }, 
            { where : { id : user?.dataValues?.id } }
        )    
        
        // @send response
        res.header("Authorization", `Bearer ${accessToken}`)
            .status(200)
            .json({
                message: "User created successfully",
                user
            });

        // @generate email message
        // const template = fs.readFileSync(path.join(process.cwd(), "templates", "index.html"), "utf8");
        // const message  = handlebars.compile(template)({ link : `http://localhost:5000/api/auth/verify/${accessToken}` })

        //@send verification email
        const mailOptions = {
            from: config.GMAIL,
            to: email,
            subject: "Verification",
            html: `<h1> Click <a href="http://localhost:5000/api/auth/verify/${accessToken}">here</a> to verify your account</h1>`
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

// @keeplogin
export const keepLogin = async (req, res, next) => {
    try {
        
        // @get user data
        const user = await User?.findOne({ where : { id : req.user.id } });

        // @delete password from response
        delete user?.dataValues?.password;

        // @return response
        res.status(200).json({ user })
    } catch (error) {
        next(error)
    }
}

// @verify account
export const verify = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        // @get token from body
        const { token } = req.params;    
        
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

export const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;     
        await validation.EmailValidationSchema.validate(req.body);

        const isUserExist = await User?.findOne({ where : { email } });

        if (!isUserExist) throw ({ 
            status : error.BAD_REQUEST_STATUS, 
            message : error.USER_DOES_NOT_EXISTS 
        })

        const accessToken = helpers.createToken({ id: isUserExist?.dataValues?.id, username : isUserExist?.dataValues?.username });

        await User?.update({ verify_token : accessToken, expired_token : moment().add(1, "days").format("YYYY-MM-DD HH:mm:ss")}, 
            { where : { id : isUserExist?.dataValues?.id }})

        // const template = fs.readFileSync(path.join(process.cwd(), "templates", "email.html"), "utf8");

        // const message  = handlebars.compile(template)({ link : `http://localhost:3000/reset_password/${accessToken}` })

        const mailOptions = {
            from: config.GMAIL,
            to: email,
            subject: "Reset Password",
            html: `<h1> Click <a href="http://localhost:5000/api/auth/reset_password/${accessToken}">here</a> to reset your password</h1>`
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
                status : errorMiddleware.BAD_REQUEST_STATUS , 
                message : error?.errors?.[0] 
            })
        }
        next(error)
    }
}


export const resetPassword = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { password } = req.body;
        await validation.resetPasswordSchema.validate(req.body);

        const userExists = await User?.findOne({ where: {id : req.user.id},
                attributes : { exclude : ["verify_token","expired_token"] } });

        if (!userExists) throw ({ 
            status : error.BAD_REQUEST_STATUS, 
            message : error.USER_DOES_NOT_EXISTS 
        })

        const hashedPassword = helpers.hashPassword(password);

        await User?.update(
            { 
                password: hashedPassword,
                verify_token : null,
                expired_token : null 
            }, 
            { where: { id: req.user.id } }
        );

        const users = await User?.findAll({ where : { id : req.user.id },
                attributes : { exclude : ["password"] }});

        res.status(200).json({ 
            message : "Reset password success",
            users
        })

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();

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
    const transaction = await db.sequelize.transaction();
    try {
        const { username } = req.body;
        await validation.changeUsernameSchema.validate(req.body);

        const usernameExists = await User?.findOne({ where: { username }});

        if (usernameExists) throw ({ 
            status : error.BAD_REQUEST_STATUS, 
            message : error.USER_ALREADY_EXISTS
        });

        const user = await User?.findOne({ where : { id : req.user.id },
                attributes : { exclude : ["password"] }});

        const accessToken = helpers.createToken({ 
            id: user?.dataValues?.id, 
            username : user?.dataValues?.username 
        });

        await User?.update(
            { 
                username,
                isVerified : 0,
                verify_token : accessToken,
                expired_token : moment().add(1,"days").format("YYYY-MM-DD HH:mm:ss")
            }, 
            { where: { id: req.user.id } }
        );      
        
        // const template = fs.readFileSync(path.join(process.cwd(), "templates", "email.html"), "utf8");

        // const message  = handlebars.compile(template)({ link : `http://localhost:3000/verification/${accessToken}` })

        const mailOptions = {
            from: config.GMAIL,
            to: user?.dataValues?.email,
            subject: "Verification Change Username ",
            html: `<h1> Click <a href="http://localhost:5000/api/auth/users/change_username/${accessToken}">here</a> to reset your password</h1>`
        }

        helpers.transporter.sendMail(mailOptions, (error, info) => {
            if (error) throw error;
            console.log("Email sent: " + info.response);
        })

        res.status(200).json({ 
            message : "Change username success",
        })

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();

        if (error instanceof ValidationError) {
            return next({
                status : error.BAD_REQUEST_STATUS, 
                message : error?.errors?.[0]
            })
        }

        next(error)
    }
}

export const changePassword = async (req, res, next) => {
    const transaction = await db.sequelize.transaction();
    try {
        const { currentPassword, newPassword } = req.body;

        await validation.changePasswordSchema.validate(req.body);

        const userExists = await User?.findOne({ where: {id : req.user.id},
            attributes : { exclude : ["verify_token","expired_token"] } });

        const isPasswordCorrect = helpers.comparePassword(currentPassword, userExists?.dataValues?.password);

        if (!isPasswordCorrect) throw ({ 
            status : error.BAD_REQUEST_STATUS,
            message : error.INCORRECT_PASSWORD 
        });  
        
        const hashedPassword = helpers.hashPassword(newPassword);

        await User?.update({ password: hashedPassword }, 
            { where: { id: req.user.id } }
        );

        const users = await User?.findAll(
            { where : { id : req.user.id },
                attributes : { exclude : ["password"]}
            }
        );

        res.status(200).json({ 
            message : "Changed password success",
            users
        })

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();

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
        const { email } = req.body;
        await validation.EmailValidationSchema.validate(req.body);
        
        const emailExists = await User?.findOne({ where: { email }});

        if (emailExists) throw ({ 
            status : error.BAD_REQUEST_STATUS, 
            message : error.EMAIL_ALREADY_EXISTS 
        });

        const user = await User?.findOne(
            { where : { id : req.user.id },
                attributes : { exclude : ["password"] }
            }
        );

        const accessToken = helpers.createToken({ 
            id: user?.dataValues?.id, 
            username : user?.dataValues?.username 
        });

        await User?.update(
            { 
                email,
                isVerified : 0,
                verify_token : accessToken,
                expired_token : moment().add(1,"days").format("YYYY-MM-DD HH:mm:ss")
            }, 
            { 
                where: { id : req.user.id }
            }
        );
        
        // const template = fs.readFileSync(path.join(process.cwd(), "templates", "email.html"), "utf8");

        // const message  = handlebars.compile(template)({ link : `http://localhost:3000/verification/${accessToken}` })

        const mailOptions = {
            from: config.GMAIL,
            to: email,
            subject: "Verification Change Email",
            html: `<h1> Click <a href="http://localhost:5000/api/auth/users/change_email/${accessToken}">here</a> to change your email</h1>`
        }

        helpers.transporter.sendMail(mailOptions, (error, info) => {
            if (error) throw error;
            console.log("Email sent: " + info.response);
        })

        res.status(200).json({ 
            message : "Changed email success. Please check your email to verify", 
        })

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();

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
        const { phone } = req.body;        
        await validation.changePhoneSchema.validate(req.body);

        const phoneExist = await User?.findOne({ where : { phone } });

        if (phoneExist) throw ({ 
            status : error.BAD_REQUEST_STATUS, 
            message : error.PHONE_ALREADY_EXISTS 
        })

        const userExist = await User?.findOne(
            { where : { id : req.user.id },
                attributes : { exclude : ["password"] }
            }
        );

        if (!userExist) throw ({
            status : error.NOT_FOUND_STATUS,
            message : error.USER_DOES_NOT_EXISTS
        })

        await User?.update({ phone }, { where : { id : req.user.id } })
        const user = await User?.findOne(
            { where : { id : req.user.id },
                attributes : { exclude : ['password'] }}
        );

        res.status(200).json({ 
            message : "Change phone number success",
            user
        })

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();

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
    const transaction = await db.sequelize.transaction();
    try {
        if (!req.file) {
            return next ({ 
                status: error.BAD_REQUEST_STATUS,
                message: "Please upload an image." 
            })
        }

        const user = await User?.findOne(
            { where : {id : req.user.id},
                attributes : ['imgProfile']
            }
        );
        
        if(user?.dataValues?.imgProfile){
            cloudinary.v2.api
                .delete_resources([`${user?.dataValues?.imgProfile}`], 
                    { type: 'upload', resource_type: 'image' })
                .then(console.log);
        }

        await User?.update(
            { imgProfile : req?.file?.filename }, 
            { where : { id : req.user.id }}
        )

        res.status(200).json(
            { 
                message : "Image uploaded successfully", 
                imageUrl : req.file?.filename 
            }
        )

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
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
        const user = await User?.findOne( { where : { id : req.user.id } } );

        if (!user) throw ({ 
            status : error.BAD_REQUEST_STATUS, 
            message : error.USER_DOES_NOT_EXISTS 
        })

        if (!user.imgProfile) throw ({ 
            status : error.NOT_FOUND_STATUS, 
            message : "Profile picture is empty"
        })

        res.status(200).json(config.URL_PIC + user.imgProfile) 
    } catch (error) {
        next(error)
    }
}