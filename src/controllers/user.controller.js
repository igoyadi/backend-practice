import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens=async(userId)=>{
    try {
        const user =await User.findById(userId)
        const accesstoken= await user.generateAccessToken()
        const refreshtoken= await user.generateRefereshToken()
        user.refreshtoken=refreshtoken
        user.save({validateBeforeSave:false})
        return {accesstoken,refreshtoken}
    } catch (error) {
        throw new ApiError(500,"something went wrong while generating access token")
    }

}

const registerUser=asyncHandler(async(req,res)=>{
    const {fullName,email,username,password}=req.body
    console.log(fullName,email,username,password,"uservalue")
    if([fullName,email,username,password].some((field)=>
    field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required required")
    }
    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }
    const avatarLocalPath=req.files?.avatar[0]?.path;
    let coverImageLocalPath

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }
    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Somwthing Went wrong while registering the user")
    }
    return  res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered Successfully")
    )


})

const loginUser=asyncHandler(async(req,res)=>{
    const {email,username,password}=req.body
    if(!username || !email){
        throw new ApiError(400,"Please enter username or email")
    }
    const user= await User.findOne({
        $or:['username','email']
    })
    if(!user){
        throw new ApiError(404,"User does not exist")

    }
    const isPasswordValid=await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(404,"Enter correct password")
    }
    const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id)
    const loggesInUser=await User.findById(user._id).select("-password -refreshToken")
    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggesInUser,accessToken,refreshToken
        },"User Login successfully")
    )
})

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,{
            $set:{
                refreshToken:undefined
            }
        },{
            new:true
        }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res.status(200).clearCookie("accessToken",accessToken,options).clearCookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,{},"Logout Successfully"))
})

export {registerUser,loginUser,logoutUser}