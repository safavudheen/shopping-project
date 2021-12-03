var db = require("../config/connection");
var collection= require('../config/collections')
const bcrypt=require('bcrypt');
const { ObjectId, Collection } = require("mongodb");
// var objectId=require('mongodb').ObjectId;
const { response } = require("../app");
const collections = require("../config/collections");
module.exports={

    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            
        userData.password=await bcrypt.hash(userData.password,10)
        db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
            // console.log(data);
            resolve(data.ops[0])
        })
        
    })


    },
    
    
doLogin:(userData)=>{
        return new Promise(async (resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            
    if(user){
         bcrypt.compare(userData.password,user.password).then((status)=>{
                    if(status){
                        console.log("login success");
                        response.user=user
                        response.status=true
                        resolve(response)
                    }else{
                        console.log('login failed');
                        resolve({status:false})
                    }
                })
                
            }else{
                console.log("logiin failed");
                resolve({status:false})
            }
     })
     },
     addToCart:(proId,userId)=>{
         return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
            if(userCart){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user:ObjectId(userId)},

                {  $push:{products:ObjectId(proId)}}
                )

            }else{
                let cartObj={
                    user:ObjectId(userId),
                    products:[ObjectId(proId)]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
         })
     },
     getCartProducts:(userId)=>{
         return new Promise(async(resolve,reject)=>{
             let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                 {
                     $match:{user:ObjectId(userId)}
                 },
                //  {
                    //  $lookup:{
                    //      from:collection.PRODUCT_COLLECTION,
                    //      let:{prodList:'$products'},
                    //     pipeline:[
                    //         {
                    //             $match:{
                    //                 $expr:{
                    //                     $in:['$_id',"$$prodList"]
                    //                 }
                    //             }
                    //         }
                    //     ],
                    //     as:'cartItems'
                    //     }
                    //  }
                 
             ]).toArray()
                console.log(cartItems)
                 resolve(cartItems[0].cartItems)
             
         })
        },
        getCartCount:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let count=0
                let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)})
                if(cart){
                    count=cart.products.length
                }
                resolve(count)
            })
        }
}
