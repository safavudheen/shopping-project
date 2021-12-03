var db = require("../config/connection");
var collection= require('../config/collections');
var objectId=require('mongodb').ObjectId;
const collections = require("../config/collections");
const { response } = require("express");

module.exports={

    addProduct:(product,callback)=>{
        // console.log(product);

        db.get().collection('product').insertOne(product).then((data)=>{
            // console.log(data);
            callback(data.insertedId)
           // ^(data.ops[0]._id)
        })

    },
getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            // console.log(products);
            resolve(products)
        })
    },
    // db.product.remove({"_id":ObjectId("61179feadf2a32d8569b21a4")})
    // db.product.deleteOne( {"_id": ObjectId("6117a116df2a32d8569b21a5")})
    // (> db.getCollection('product')==>answer
    //     shopping.product    )

deleteProduct:(proId)=>{
    return new Promise((resolve,reject)=>{  
        db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(proId)}).then((response)=>{
         console.log(response);
         resolve(response)  
        })
    } )  
},
getProductDetails:(proId)=>{
    return new Promise((resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(proId)}).then((product)=>{
            resolve(product)
        })
    })
},
updateProduct:(proId,proDetails)=>{
    return new Promise((resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION)
        .updateOne({_id:objectId(proId)},{
            $set:{
                name:proDetails.name,
                description:proDetails.description,
                price:proDetails.price,
                category:proDetails.category
            }
        }).then((response)=>{
        resolve()
        })
    })
}

    
}