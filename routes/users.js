const { response } = require('express');
var express = require('express');
const session = require('express-session');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const verfyLogn = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}

/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  console.log(user);
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', { products, user, cartCount })
  })

});
router.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/login', { 'loginErr': req.session.loginErr })
    req.session.loginErr = false
  }
})
router.get('/signup', (req, res) => {
  res.render('user/signup')
})
router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    // console.log(response);
    req.session.loggedIn = true
    req.session.user = response
    res.redirect('/')
  })
})
router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true
      req.session.user = response.user

      res.redirect('/')
    } else {
      req.session.loginErr = true
      res.redirect('/login')
    }
  })


})
router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})
router.get('/cart', verfyLogn, async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let totalValue = await userHelpers.getTotalAmount(req.session.user._id)
  let user= req.session.user._id
  // console.log(products);
  res.render('user/cart', { products, user, totalValue })
})
router.get('/add-to-cart/:id', (req, res) => {
  // console.log("api call")
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    // console.log("res.json({status:true})")
    // res.redirect('/')
    res.json({ status: true })
  })
})

router.post('/change-product-quantity', (req, res,next) => {
  // console.log(req.body);
  userHelpers.changeProductQuantity(req.body).then(async(response) => {
  response.total = await userHelpers.getTotalAmount(req.body.user)
  // console.log(response)
    res.json(response)
  })
})

router.get('/place-order', verfyLogn, async(req, res)=>{
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/placeOrder', { total, user:req.session.user})
})

router.post('/place-order',async(req,res)=>{
  // console.log( req.body)
  let products=await userHelpers.getCartProductList(req.body.userId)
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
// //payment method
    if(req.body['payment-method']==='COD'){
    res.json({codSuccess:true})

    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)
      })
    }

  })
 
})

router.get('/order-success',(req,res)=>{
  res.render('user/orderSuccess',{user:req.session.user._id})
})
router.get('/order-list',async(req,res)=>{
  let orders=await userHelpers.getUserOrders(req.session.user._id)
  console.log(orders)
  res.render('user/order-list',{user:req.session.user,orders})
})


router.post('/verify-payment',(req,res)=>{
  console.log("verify",req.body)
  userHelpers.verifyPayment(req.body).then((response)=>{
    console.log('pay verify',response)
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then((response)=>{
      console.log('payment successfull')
      res.json({status:true})
    })
  }).catch((err)=>{ 
    console.log('error',err)
    res.json({status:false,errMsg:'error message'})
  })
})
module.exports = router; 