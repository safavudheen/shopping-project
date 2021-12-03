const { response } = require('express');
var express = require('express');
var router = express.Router();

const {render} =require('../app');
const productHelpers = require('../helpers/product-helpers');
/* GET users listing. */
router.get('/', function(req, res, next) {


productHelpers.getAllProducts().then((products)=>{
  res.render('admin/view-product',{admin:true,products})
})

 
});
router.get('/add-product',function(req,res){
 res.render('admin/add-product') 
})
router.post('/add-product',(req,res)=>{
  // console.log(req.body);
  //console.log(req.files.Image);

  productHelpers.addProduct(req.body,(id)=>{
    let image=req.files.Image
    // console.log(id);
    image.mv('./public/product-image/'+id+'.jpg',(err,done)=>{
      if(!err){
        res.render('admin/add-product')
      }else{
        console.log(err)
      }
    })
    
  })
})

router.get('/delete-product/:id',(req,res)=>{
        let proId=req.params.id
// with out id in second case let proId=req.quary.id
        //  console.log(proId);
         productHelpers.deleteProduct(proId).then((response)=>{
        res.redirect('/admin/')
         })
})

router.get('/edit-product/:id',async (req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  // console.log(product)
  res.render('admin/edit-product',{product})
})
router.post('/edit-product/:id',(req,res)=>{
  let id=req.params.id
  // console.log(req.body);
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    if(req.files.Image){
      let image=req.files.Image
      image.mv('./public/product-image/'+id+'.jpg')
    }
  })
})
module.exports = router;

//* module.exports = router; //
