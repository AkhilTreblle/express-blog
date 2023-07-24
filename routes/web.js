var express = require('express');
const bcrypt = require('bcrypt');
var router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());
const moment = require('moment');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/myExpress');

const session = require('express-session');

router.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}));
const User = require('../models/user');
const Post = require('../models/post');
const Category = require('../models/category');
checkSignIn = (req, res,next) => {
  if(req.session.user){
     next();     //If session exists, proceed to page
  } else {
    res.redirect('/logout');
  }
}
router.get('/', (req, res) => {
    User.findOne({ role: 'admin' })
      .then(adminUser => {
        if (!adminUser) {
          const newUser = new User({
            name: 'admin',
            email: 'admin@express.com',
            password: bcrypt.hashSync('admin123', 10),
            role: 'admin'
          });
  
          return newUser.save();
        }
      })
      .then(() => {
        Post.find({ status: 'approved' }).populate('user').sort({ _id: -1 })
        .then(approvedPosts => {
          res.render('home', { approvedPosts });
        })
        .catch(error => {
          console.error('Error fetching approved posts:', error);
          res.render('signup', {
            message: 'Database error',
            type: 'error'
          });
        });
      })
      .catch(error => {
        console.error('Error finding or creating admin user:', error);
        res.render('signup', {
          message: 'Database error',
          type: 'error'
        });
      });
  });

router.get('/signup',(req,res)=> {
res.render('signup',{message:''});
});
  router.post('/login', (req, res) => {
    if (!req.body.email || !req.body.password) {
      return res.render('signup', { message: 'Please provide both email and password' });
    }
  
    User.findOne({ email: req.body.email })
      .then(user => {
        if (!user) {
          return res.render('signup', { message: 'User not found' });
        }
  
        const passwordMatch = bcrypt.compareSync(req.body.password, user.password);
  
        if (passwordMatch) {
          req.session.user = {
            id: user._id,
            email: user.email,
            role: user.role,
            name: user.name
          };
            
          
            res.redirect('/list'); 
            
          
        } else {
          res.render('signup', { message: 'Invalid Credentials' });
        }
      })
      .catch(error => {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
      });
  });
  

  router.get('/list', checkSignIn, (req, res) => {
    const user = req.session.user;
    const message = req.session.message;
    req.session.message = null;
  
    if (user.role === 'admin') {
      User.find()
        .then(allUsers => {
          res.render('super-admin', { user, message, allUsers }); // Pass the session user object and allUsers array to the view
        })
        .catch(error => {
          console.log(error);
          res.status(500).json({ error: 'An error occurred' });
        });
    } else if (user.role === 'manager') {
      Category.findOne({ user: user.id })
        .then(category => {
          if (!category) {
            res.render('signup', { message: 'Error login' });
            // Return here or use else condition for the next .then()
            return;
          }
  
          return Post.find({ status: 'pending', category: category._id }).populate('user');
        })
        .then(pendingPosts => {
          // Now you have the 'pendingPosts' and 'foundCategory' data, you can render the view with this data
          res.render('category-manager', { user, pendingPosts });
        })
        .catch(error => {
          res.render('signup', { message: 'Error creating user: ' + error });
        });
    } else {
      Category.find()
        .then(categories => {
          res.render('articles', { user, message, categories });
        })
        .catch(error => {
          console.log(error);
          res.status(500).json({ error: 'An error occurred' });
        });
    }
  });
  
  router.post('/signup', (req, res) => {

    if (!req.body.email || !req.body.password) {
      res.render('signup', { message: 'Please provide both email and passwords' });
    } else {

      const newUser = new User({
        name:req.body.name,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10),
        role:'user',
      });
      
      req.session.user = newUser;

      newUser.save()
        .then(() => {
          res.redirect('/list');

        })
        .catch((error) => {
          res.render('signup', { message: 'Error creating user: ' + error });
        });
    }
  });
  router.get('/logout', function(req, res){
    req.session.destroy(function(){
       console.log("user logged out.")
    });
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.redirect('/');
  });
 


router.get('/edit/:id',(req,res)=>{
  User.findById(req.params.id)
  .then(user => {
    res.json({ user });
  })
  .catch(error => {
    console.log(error);
    res.status(500).json({ error: 'An error occurred' });
  });
  });

  router.post('/blog-post', (req, res) => {

      const newPost = new Post({
        title:req.body.title,
        content: req.body.content,
        status: 'pending',
        user:req.session.user.id,
        category:req.body.category
      });
   

      newPost.save()
        .then(() => {
          req.session.message = 'success';
        
          res.redirect('/list')
        })
        .catch((error) => {
          res.render('list', { message: 'Error creating user: ' + error });
        });
    
  });
  router.get('/blog-posts', (req, res) => {
    const userId = req.session.user.id;
  
    Post.find({ user: userId }).sort({ _id: -1 }).populate('category')
      .then(posts => {
         user = req.session.user;
        res.render('blogs', { posts ,user});
      })
      .catch(error => {
        console.error(error);
        res.status(500).json({ error: 'An error occurred' });
      });
  });

  router.post('/category', (req, res) => {
    const newCategory = new Category({
      name: req.body.title,
      user: req.body.user
    });
  
    // Find the user by their ID and update their status to "manager"
    User.findByIdAndUpdate(req.body.user, { role: 'manager' })
      .then(() => {
        return newCategory.save();
      })
      .then(() => {
        req.session.message = 'success';
        res.redirect('/list');
      })
      .catch((error) => {
        res.render('super-admin', { message: 'Error creating category: ' + error });
      });
  });

// router.get('/manage-blogs', checkSignIn, (req, res) => {
//   const loggedInUserId = req.session.user.id;

//   Category.findOne({ user: loggedInUserId })
//   .then(category => {
//     if (!category) {
//       res.render('signup', { message: 'Error login' });
//       // Return here or use else condition for the next .then()
//       return;
//     }

//     foundCategory = category; // Store the category in the variable

//     return Post.find({ status: 'pending', category: category._id });
//   })
//   .then(pendingPosts => {
//     // Now you have the 'pendingPosts' and 'foundCategory' data, you can render the view with this data
//     res.render('category-manager', { pendingPosts, category: foundCategory });
//   })
//   .catch(error => {
//     res.render('signup', { message: 'Error creating user: ' + error });
//   });
// });


router.post('/update-status', (req, res) => {
  Post.findByIdAndUpdate(req.body.id, { status: req.body.status })
    .then(response => {
      res.json({ message: "Status updated successfully" });
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({ error: 'An error occurred' });
    });
});

router.get('/users',(req,res)=>{
  const userId = req.session.user.id;

  User.find().sort({ _id: -1 })
  .then(users => {
    user = req.session.user;
    res.render('users', { users ,user});

  }).catch(error => {
      console.log(error);
      res.status(500).json({ error: 'An error occurred' });
    });
 

})


module.exports = router;