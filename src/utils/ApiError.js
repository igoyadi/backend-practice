class ApiError extends Error{
    constructor(
        statusCode,
        message= "Something went wrong",
        errors= [],
        stack="",

    ){
        super(message) //overwrite
        this.statusCode=statusCode
        this.data=null
        this.message=message
        this.success=false;
        this.errors=errors

        if(stack){
            this.Stack=stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export {ApiError}