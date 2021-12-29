var db = require("../config/connection");
var collection = require('../config/collections')
const bcrypt = require('bcrypt');
const { ObjectId, Collection } = require("mongodb");
var objectId = require('mongodb').ObjectId;
const { response, options } = require("../app");
const collections = require("../config/collections");
const { createHmac } = import('crypto');
const Razorpay = require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_VwWcwrqVe1bcUz',
    key_secret: '8YW1ELfinSu4sdc8XTt4Deel',
});
module.exports = {

    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {

            userData.password = await bcrypt.hash(userData.password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                // console.log(data);
                resolve(data.ops[0])
            })

        })


    },


    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })

            if (user) {
                bcrypt.compare(userData.password, user.password).then((status) => {
                    if (status) {
                        console.log("login success");
                        response.user = user
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('login failed');
                        resolve({ status: false })
                    }
                })

            } else {
                console.log("logiin failed");
                resolve({ status: false })
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj = {
            item: ObjectId(proId),
            quantity: 1
        }

        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: ObjectId(userId), "products.item": ObjectId(proId) },
                            {
                                $inc: { 'products.$.quantity': 1 }
                            }).then(() => {
                                resolve()
                            })
                } else {



                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: ObjectId(userId) },
                            {
                                $push: { products: proObj }
                            }
                        ).then((response) => {
                            resolve()
                        })
                }
            } else {
                let cartObj = {
                    user: ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: "item",
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                // --------------------------------------
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

                // LOOKUP is used FOR  THE USER CARD PRODUCT ID'S PRODUCT GET MATCH FROM THE COLLECTION OF THE PRODUCT
                // pipeline used fo the checking inside the database
                // {
                //     $lookup: {
                //         from: collection.PRODUCT_COLLECTION,
                //         let: { prodList: '$products' },
                //         pipeline: [
                //             {
                //                 $match: {
                //                     $expr: {
                //                         $in: ['$_id', "$$prodList"]
                //                     }
                //                 }
                //             }
                //         ],
                //         as: 'cartItems'
                //     }
                // }

            ]).toArray()
            // console.log(cartItems)
            resolve(cartItems)

        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)

        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: ObjectId(details.cart) },
                        {
                            $pull: { products: { item: ObjectId(details.product) } }
                        }
                    ).then((response) => {
                        resolve({ removeProduct: true })
                    })



            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne({ _id: ObjectId(details.cart), "products.item": ObjectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }).then((response) => {
                            resolve({ status: true })
                        })
            }
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: "item",
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, products: { $arrayElemAt: ['$products', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$products.price'] } }
                    }
                },

            ]).toArray()
            // console.log(total[0].total)
            // const Total = total[0].total
            resolve(total[0].total)

        })
    },
    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(order, products, total)
            let status = order['payment-method'] === 'COD' ? 'placed' : 'pending'
            const date = new Date()
            let orderObj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userId: objectId(order.userId),
                paymentMethod: order['payment-method'],
                products: products,
                totalAmount: total,
                status: status,
                date: date
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).remove({ user: objectId(order.userId) })
                resolve(response.insertedId)
                // console.log('theeeekoooi',response.ops[0]._id)
            }).catch((error) => {

                console.log(error)
            })
            // your catch block code goes here


        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectId(userId) })
            resolve(cart.products)
        })
    },
    // $project:
    // group for the calculate induvidal product

    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            console.log(userId)
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: objectId(userId) }).toArray();
            console.log(orders);
            resolve(orders)
        })
    },
    generateRazorpay: (orderId,totalPrice) => {
        return new Promise((resolve, reject) => {
            var options={
                amount: totalPrice*100,  // amount is smallest unit
                 currency: "INR", 
                 receipt: ''+orderId, 
                 notes: { key1: "value3", key2: "value2" }
            }
            instance.orders.create(options,function(err,order){
                if(err){
                    console.log(err)
                }else{
                    console.log("the vlu",order)
                  resolve(order)
                }
                
        })
    })
    // .catch((error) => {

    //     console.log(error)
    // })
},
verifyPayment:(details)=>{
    return new Promise((resolve,reject)=>{
        console.log('details of verify',details)
        const crypto = require('crypto');
        let hmac = crypto.createHmac('sha256','8YW1ELfinSu4sdc8XTt4Deel')
        hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]'])
        hmac=hmac.digest( 'hex' )
        console.log("koooi the value",hmac,'second',details)
        if(hmac==details['payment[razorpay_signature]']){
            resolve()
        }else{
            reject() 
        }
    }) 
    },
changePaymentStatus:(orderId)=>{ 
    return new Promise((resolve,reject)=>{
        db.get().collection(collection.ORDER_COLLECTION)
        .updateOne({_id:objectId(orderId)},
        {
            $set:{
                status:'placed'
            }
        }
        ).then(()=>{
            resolve()
        })
    }) 
}

}
