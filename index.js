const port = process.env.PORT || 4000;
const express = require("express");
const app= express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

// Replace "*" with your specific Vercel frontend URL for more secure configuration
app.use(cors({
  origin: '*', // Replace this with your Vercel URL
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true // This is important if you’re handling authentication with cookies
}));

app.use(express.json());

// db connection

//mongoose.connect("mongodb+srv://MongodbProj:1234567890@cluster0.mypnmmg.mongodb.net/e-commerce")

mongoose.connect("mongodb+srv://MongodbProj:1234567890@cluster0.mypnmmg.mongodb.net/e-commerce")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB connection error:", err));



//api creation [5:11;29]
app.get("/",(req,res)=>{
    res.send("Express App is Running")

})


app.listen(port,(error)=>{
    if (!error)
    {
        console.log("server running on port "+port)

    }
    else{
        console.log("Error :" +error)
    }
})

//Image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

//creating upload endpoint for images
app.use('/images',express.static('upload/images'))

/*app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })

})*/
app.post("/upload", upload.single('product'), (req, res) => {
  res.json({
    success: 1,
    image_url: `https://shopstopbe.onrender.com/images/${req.file.filename}`
  });
});


//schema for creating product
const Product = mongoose.model("Product",{
    id:{
        type:Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    tag:{
        type:String,
        required:true,
    },
    image:
    {
        type:String,
        required:true,
    },
    category:
    {
        type:String,
        required:true,
    },
    new_price:
    {
        type:Number,
        required:true,
    },
    old_price:
    {
        type:Number,
        required:true,
    },
    date:
    {
        type:Date,
        required:Date.new,
    },
    available://if prod available or out of stock
    {
        type:Boolean,
        default:true
    },

}) 
app.post('/addproduct',async(req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id=last_product.id+1;
    }
    else
    {
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        tag:req.body.tag,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success:true,
        name:req.body.name,
    })
})

//api for deleting
app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json(
        {
            success:true,
            name:req.body.name
        }
    )

})

//api for display/ all products
/*app.get('/allproducts',async(req,res)=>{
    let products = await Product.find({});
    console.log("All Products fetched");
    res.send(products);
})*/
app.get('/allproducts', async (req, res) => {
  try {
    let products = await Product.find({});
    console.log("All Products fetched");
    res.send(products);
  } catch (error) {
    console.error("Error fetching all products:", error);
    res.status(500).send("Internal Server Error");
  }
});


//api for user creation/seache for user model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})
//creating end point for regs user
app.post('/signup',async(req,res)=>{
   
    let check = await Users.findOne({email:req.body.email});

    if(check)
    {
        return res.status(400).json({success:false,errors:"Existing user found with same email address"})
    }
    let cart ={};
    for(let i=0;i<300;i++)
    {
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })
     await user.save();
     const data ={
        user:{
            id:user.id
        }
     }
     const token = jwt.sign(data,'secret_ecom');
     res.json({success:true,token})
})  

//end pint for user login

app.post('/login',async(req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data ={
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else
        {
            res.json({success:false,errors:"wrong password"});
        }
        
    }
    else{
        res.json({success:false,errors:"Wrong Email ID"});
    }

})
//api for new collection
app.get("/newcollections", async (req, res) => {
	let products = await Product.find({});
  let arr = products.slice(1).slice(-8);
  console.log("New Collections");
  res.send(arr);
});

// MiddleWare to fetch user from database
const fetchuser = async (req, res, next) => {
    const token = req.header("auth-token");
    if (!token) {
      res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
  };


//Create an endpoint for saving the product in cart
app.post('/addtocart', fetchuser, async (req, res) => {
	console.log("Add Cart");
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData:userData.cartData});
    res.send("Added")
  })

  //Create an endpoint for saving the product in cart
app.post('/removefromcart', fetchuser, async (req, res) => {
	console.log("Remove Cart");
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]!=0)
    {
      userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData:userData.cartData});
    res.send("Removed");
  })

  //Create an endpoint for saving the product in cart
app.post('/getcart', fetchuser, async (req, res) => {
  console.log("Get Cart");
  let userData = await Users.findOne({_id:req.user.id});
  res.json(userData.cartData);

  })
// Assuming you have a Product model defined as shown in your previous code

// Endpoint to update a product by ID
// PUT endpoint for updating a product by ID
/*app.put('/editproduct/:id', async (req, res) => {
    const { id } = req.params; // Get the product ID from the URL
    const updateData = req.body; // Get the updated data from the request body

    try {
        // Find a product by ID and update it with the provided data
        // { new: true } option returns the updated document
        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
        
        if (updatedProduct) {
            res.json({
                success: true,
                message: 'Product updated successfully',
                data: updatedProduct
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating product'
        });
    }
});*/

  






